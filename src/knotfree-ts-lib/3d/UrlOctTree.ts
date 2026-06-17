
import * as dns from "dns/promises"

export const dnsGotohere = "149.28.250.163"
export const dnsCloudflare = "1.1.1.1"


// string format of a cube
// "testmain"-number['n'|'s']number['u'|'d']number['e'|'w']['-'|'']number'p'
// where world is the name of world in lowercase letters, 
// n/s is north/south, 
// u/d is up/down, 
// e/w is east/west, 
// and 2^p is the size of the cube and also all coordinates must be multiplied by 2^p to get real value.
// For example: "testmain-10n5u3e2p" represents a cube in the world named "testmain"
// the size of the cube is 2^2=4 meters, and the coordinates are x = 10*4 meters north, y = 5*4 meters up, z = 3*4 meters east of the origin.

export interface Cube {
    world: string, // name of the world
    x: number, // in meters, where positive x is north and negative x is south
    y: number, // in meters, where positive y is up and negative y is down
    z: number, // in meters, where positive z is east and negative z is west
    p: number, // a power of 2, representing the size of the cube. For example, if p = 2, then the cube is 2^2=4 units wide in each dimension.
}

export type CubeString = string

export function getParentCube(cube: Cube): Cube {
    return getParentCubeWithOcttreeIndex(cube)[0]
}

export function getParentCubeWithOcttreeIndex(cube: Cube): [Cube, number] {
    const newpower = 2 ** (cube.p + 1)
    const remainderx = Math.abs(cube.x % newpower)
    const remaindery = Math.abs(cube.y % newpower)
    const remainderz = Math.abs(cube.z % newpower)
    const temp = {
        world: cube.world,
        // round down to the nearest multiple of power
        x: cube.x - remainderx,
        y: cube.y - remaindery,
        z: cube.z - remainderz,
        p: cube.p + 1
    }
    const index = (remainderx != 0 ? 1 : 0) | (remaindery != 0 ? 2 : 0) | (remainderz != 0 ? 4 : 0)
    return [temp, index]
}


export function getChildCube(cube: Cube, which: number): Cube {
    // is will have the same coordinates as the parent cube except that the p value will be 1 less 
    // and then depending on which child cube it is it will add the appropriate amount to the x, y, and z coordinates.
    let childCube = {
        world: cube.world,
        x: cube.x,
        y: cube.y,
        z: cube.z,
        p: cube.p - 1
    }
    const halfSize = 2 ** (cube.p - 1)
    if (which & 1) {
        childCube.x += halfSize
    }
    if (which & 2) {
        childCube.y += halfSize
    }
    if (which & 4) {
        childCube.z += halfSize
    }
    return childCube
}


// cubeToString will Convert a cube to a string
// note that the coordinates must be multiples of 2^p, so if they are not then it's an error. 
// For example, if p is 1 then the cube size is 2, so all the coordinates must be even numbers or else it's an error. 
// When we make it into a string it should round down to the nearest even number and then when we parse it back it should be the same as the original cube but with the coordinates rounded down to the nearest even number. So we expect x to become 2, y to become 4, and z to become -4 when we parse it back from the string.
export function cubeToUrlString(cube: Cube): [CubeString, Error | null] {

    const xDir = cube.x >= 0 ? 'n' : 's'
    const yDir = cube.y >= 0 ? 'u' : 'd'
    const zDir = cube.z >= 0 ? 'e' : 'w'
    const power = 2 ** cube.p
    const scaledx = cube.x / power
    const scaledy = cube.y / power
    const scaledz = cube.z / power
    if (!Number.isInteger(scaledx) || !Number.isInteger(scaledy) || !Number.isInteger(scaledz)) {
        let errorMessage = `Cube coordinates must be multiples of p. Got x: ${cube.x}, y: ${cube.y}, z: ${cube.z}, p: ${cube.p}`
        return ["", new Error(errorMessage) ]
    }
    return [`${cube.world}-${Math.abs(scaledx)}${xDir}${Math.abs(scaledy)}${yDir}${Math.abs(scaledz)}${zDir}${cube.p}p`, null]
}

// Convert a string to a cube
export function stringToCube(str: CubeString): [Cube, Error | null] {
    const regex = /^([a-z]+)-(\d+)([ns])(\d+)([ud])(\d+)([ew])(-?\d+)p$/
    const match = str.match(regex)
    if (!match) {
        return [{
            world: "",
            x: 0,
            y: 0,
            z: 0,
            p: 0
        }, new Error(`Invalid cube string: ${str}`)]
    }
    const world = match[1]
    const xnum = parseInt(match[2]) * (match[3] === 'n' ? 1 : -1)
    const ynum = parseInt(match[4]) * (match[5] === 'u' ? 1 : -1)
    const znum = parseInt(match[6]) * (match[7] === 'e' ? 1 : -1)
    const p = parseInt(match[8])
    const size = Math.pow(2, p)
    return [{ world, x: xnum * size, y: ynum * size, z: znum * size, p }, null]
}


export interface TreeStatus {
    name: string,
    cube: Cube | null, // the cube represented by this name if it was found and could be parsed as a cube, otherwise null
    level: number, // the p value of the cube named by name
    index: number, // if this is a parent node, which child index is the cube that we are looking for. This is the number at the end of the name. For example, if the name is testmain-0n0u0e16p-3 then the index would be 3. If this is not a parent node or if the name was not found or could not be parsed as a cube, then this will be null.
    found: boolean,
    isParent: boolean, // and not a leaf
    wasXYZ: boolean, // found as a an .xyz domain name and not a .vr domain name

    // is TXT meta_group_id
    groupId: string | null, // the group that this tree belongs to, which is the same for all leaf nodes rendered by the same iFrame or server. 
    defaultText: string | null, // the default TXT record for this domain, just for testing purposes.

    children: string[], // the names of the 8 child cubes else emopty array if this is a leaf node or if the children were not found during the dig.

    addresses: string[] | null, // the result of the dns lookup for this name, which should be an array of ip addresses if found and null if not found or if there was an error during the lookup.
    error: Error | null// nullable Error type
}

// CheckOneName looks for the dns name on the server and returns a TreeStatus object with the results. It checks if the name exists, if it can be parsed as a cube, and if it has a trailing number indicating that it's a parent node. It also returns any error that occurred during the dns lookup or cube parsing.
// it can be used on any name and just the cube parsing will make an error.
export async function CheckOneName(name: string, dnsServer: string): Promise<TreeStatus> {
    // console.log("CheckOneName", name, dnsServer)
    // lookup a dns name from dns server
    let result: TreeStatus = {
        name: name,
        level: 0,
        found: false,
        isParent: false,
        wasXYZ: false,
        groupId: null,
        defaultText: null,
        children: [],
        addresses: null,
        error: null, // if it's not a cube or a parent name then expect an error here, otherwise it should be what the error was during the dns lookup, if there was one.
        cube: null,
        index: -1
    }

    // Check if it ends in "-number.vr" or "-number.xyz"
    const vrMatch = name.match(/^(.+)-(\d+)\.vr$/)
    const xyzMatch = name.match(/^(.+)-(\d+)\.xyz$/)

    let baseName = name
    let trailingNumber = -1

    if (vrMatch) {
        baseName = vrMatch[1]
        trailingNumber = parseInt(vrMatch[2], 10)
        result.wasXYZ = false
        result.isParent = true
        result.index = trailingNumber
    } else if (xyzMatch) {
        baseName = xyzMatch[1]
        trailingNumber = parseInt(xyzMatch[2], 10)
        result.wasXYZ = true
        result.isParent = true
        result.index = trailingNumber
    } else {
        // No trailing number found, use the full name minus the TLD
        // baseName = name.replace(/\.(vr|xyz)$/, '')
        result.wasXYZ = name.endsWith('.xyz')
    }

    const [cube, eee] = stringToCube(baseName)
    if (eee != null) {
        result.found = false
        result.error = eee
    } else {
        result.cube = cube
        result.level = cube.p
    }

    try {
        const resolver = new dns.Resolver();
        resolver.setServers([dnsServer]);
        const addresses = await resolver.resolve4(name)
        // console.log(`DNS lookup for ${name}:`, addresses)
        result.addresses = addresses
        result.found = true
    } catch (err) {
        // console.error("DNS lookup failed:", err)
        result.error = (err as Error)
    }
    return result
}

// check both servers. return the better match. Probably the oldest.
export async function checkForTreeExistancePart1(tree: string): Promise<PromiseSettledResult<TreeStatus>[]> {

    const got = Promise.allSettled([
        CheckOneName(tree + ".vr", dnsGotohere),
        CheckOneName(tree + ".xyz", dnsCloudflare)
    ])
    return got
}

export async function checkForTreeExistance(tree: string): Promise<TreeStatus> {
    let result: TreeStatus = {
        name: tree,
        cube: null,
        level: 0,
        found: false,
        isParent: false,
        wasXYZ: false, //  was found as an .xyz domain name and not a .vr domain name. Probably costs $20/year but is hella legit.
        groupId: null,
        defaultText: null,
        children: [],
        addresses: null,
        error: null,
        index: -1
    }

    const checkresults = await checkForTreeExistancePart1(tree)

    const gotohereResult: TreeStatus | null = checkresults[0].status === "fulfilled" ? checkresults[0].value : null
    const cloudflareResult: TreeStatus | null = checkresults[1].status === "fulfilled" ? checkresults[1].value : null

    // decide which result to use. For now, just use gotohere if it found the tree and cloudflare if it didn't.
    if (gotohereResult && gotohereResult.found && cloudflareResult && cloudflareResult.found) {
        // we got them both.
        // which one is has an older creation date? 
        // TODO: get the creation date from the nameservice and use that to decide which one is older. 
        if (gotohereResult.defaultText && cloudflareResult.defaultText && gotohereResult.defaultText === cloudflareResult.defaultText) {
            result = gotohereResult
            result.wasXYZ = false
        }
    } else
        if (gotohereResult && gotohereResult.found) {
            result = gotohereResult
        } else if (cloudflareResult && cloudflareResult.found) {
            result = cloudflareResult
        } else {
            // neither found the tree, so use the gotohere result for the error message since it's more likely to be a nameservice error and not a dns resolver error.
            result = gotohereResult ? gotohereResult : cloudflareResult ? cloudflareResult : result
            result.found = false
        }

    return result
}

export async function getTxtRecords(domain: string, dnsServer: string): Promise<string[][] | null> {
    try {
        // resolveTxt returns an array of arrays (each record can have multiple strings)
        const resolver = new dns.Resolver();
        resolver.setServers([dnsServer]);

        const records: string[][] = await resolver.resolveTxt(domain);
        return records;
    } catch (error) {
        // don't care. Null is good enough. console.error(`Failed to fetch TXT records for ${domain}:`, error);
        return null;
    }
}

// TreeFullFill tries to find it and fill everything in but not checking the children yet.
export async function TreeFullFill(tree: string): Promise<TreeStatus> {
    const treeStatus = await checkForTreeExistance(tree)
    if (treeStatus.found) {
        // get the default TXT and also the meta_group_id TXT record for this tree and add them to the treeStatus object. The meta_group_id should be in a TXT record called _meta_group_id.tree.vr

        // can we do these in parallel? Yes we can. Let's do it.
        const [defaultTxtRecords, metaGroupIdTxtRecords] = await Promise.allSettled([
            getTxtRecords(tree + ".vr", dnsGotohere),
            getTxtRecords("meta_group_id." + tree + ".vr", dnsGotohere)
        ]);

        if (await defaultTxtRecords) {
            const arr = defaultTxtRecords.status === "fulfilled" ? defaultTxtRecords.value : null
            if (arr) {
                treeStatus.defaultText = arr.map(record => record.join(",")).join(";") // join the array of arrays into a single string for simplicity. In real life we might want to keep them separate or parse them as key-value pairs or something.
            }
        }
        if (await metaGroupIdTxtRecords) {
            const arr = metaGroupIdTxtRecords.status === "fulfilled" ? metaGroupIdTxtRecords.value : null
            if (arr) {
                treeStatus.groupId = arr.map(record => record.join(",")).join(";")
            }
        }

        // what else? 
    }
    return treeStatus
}



