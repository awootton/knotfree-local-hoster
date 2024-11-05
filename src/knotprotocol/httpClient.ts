import * as client from './client'
import * as packets from './packets'
import * as types from '../Types'
import * as utils from '../utils'


export type httpClientGadget = {
    httpMonger: HttpMonger,
    haveNewConfig: (newConfig: types.ServerConfigList) => any,
    // subscribeToNewTopics: (newConfig: types.ServerConfigList) => any
}

// only call this once ever, on the creation of the window.
export const startHttpProxy = (config: types.ServerConfigList, host: string, port: number): httpClientGadget => {

    console.log("startTestHttpProxy called with config")
    // map of hashed name b64 to config item
    let hashedNameToConfigItem: { [key: string]: types.ServerConfigItem } = {}

    let http = NewDefaultHttpMonger()
    http.packer.restarter.connectInfo.host = host
    http.packer.restarter.connectInfo.port = port
    http.packer.restarter.connectInfo.verbose = true

    http.packer.token = config.token
    function haveNewConfig(newConfig: types.ServerConfigList) {
        // console.log("haveNewConfig called with config", newConfig)
        config = newConfig
        http.packer.subs = []
        hashedNameToConfigItem = {}
        for (let item of newConfig.items) {
            http.packer.subs.push(item.name)
            const hashedName = utils.KnotNameHash2Buffer(item.name)
            hashedNameToConfigItem[utils.toBase64Url(hashedName)] = item
        }
    }
    // function subscribeToNewTopics(newConfig: types.ServerConfigList) {
    //     // unsubscribe from the old subs list? 
    //     for (let item of newConfig.items) {
    //         let sub = packets.MakeSubscribe()
    //         sub.Address = { Type: ' ', Bytes: Buffer.from(item.name) }
    //         // sub.optionalKeyValues.set('debg',Buffer.from("12345678")) // causes debg logging in the knotfree server
    //         http.packer.write(sub)
    //         console.log("subscribeToNewTopics subscribing to", item.name)
    //     }
    // }
    haveNewConfig(config)
    // the doSubscriptions function happens on connect

    http.onMessage = (http: HttpMonger, got: Buffer, send: packets.Send) => {
        // console.log("got http message", packets.Asciiizer(got,256))
        // we want the Type and the Path. eg GET /details.md
        let logMsg = ''
        if (http.packer.restarter.connectInfo.verbose) {
            let tmp = got.toString().indexOf(" ")
            tmp = got.toString().indexOf(" ", tmp + 1)// the 2nd space
            logMsg = "Http: " + got.toString().substring(0, tmp)
            console.log(logMsg)
        }
        const b = Buffer.from(send.Address.Bytes)
        let item = hashedNameToConfigItem[utils.toBase64Url(b)]
        if (item) {
            // send it to a socket and wait for a response.
            let rep = NewDefaultReplyMonger()
            rep.send = send
            rep.connectInfo.host = item.host
            rep.connectInfo.port = item.port

            client.Startup(rep.connectInfo)
            rep.onMessage = (rep: ReplyMonger, got: Buffer) => {
                // let msg = "ReplyMonger received:" + packets.Asciiizer(got, 256)
                // console.log(msg)
                // make it into a packet
                let reply = packets.MakeSend()
                reply.Address = send.Source
                reply.Source = { Type: ' ', Bytes: Buffer.from('dummy-return-address') }
                reply.Payload = got
                for (let [key, value] of send.optionalKeyValues) { // echo the options for the sessionKey, etc.
                    reply.optionalKeyValues.set(key, value)
                }
                // reply.optionalKeyValues.set('debg', Buffer.from("12345678")) // causes debg logging in the knotfree server
                reply.toBackingUniversal()
                if (http.packer.restarter.connectInfo.verbose) {
                    console.log("ReplyMonger:", packets.Asciiizer(got, 32), "for", logMsg)
                }
                http.packer.write(reply) // fly away little bird.
                // close the socket
                setTimeout(() => { // later
                    rep.connectInfo.verbose = false
                    rep.connectInfo.private_client_not_for_use.destroy()
                }, 1000)
            }
            let msg = packets.Asciiizer(got, 256)
            let logMessage = ''
            if (http.packer.restarter.connectInfo.verboseRaw) {
                logMessage = "ReplyMonger posting to port " + rep.connectInfo.port + " with " + msg
            }
            rep.connectInfo.write(got, logMessage) // send the http message to the socket
        } else {
            console.log("ERROR no item for reply", send.backingUniversal.toString())
        }
    }
    client.StartRestarter(http.packer.restarter)

    // re-subscribe to topics every 20 min to keep the connection alive
    setInterval(() => {
        // subscribeToNewTopics(config)
        http.packer.doSubscriptions(http.packer)

    }, 20 * 60 * 1000)

    const gadget = {
        httpMonger: http,
        haveNewConfig: haveNewConfig,
        subscribeToNewTopics: http.packer.doSubscriptions(http.packer)
    }
    return gadget
}


// HttpMonger reads packets into http buffers, will write buffer to packetizer
// Two callbacks must be provided, onConnect and onMessage
export type HttpMonger = {
    packer: client.Packetizer,
    onConnect: (http: HttpMonger) => any,
    onMessage: (http: HttpMonger, got: Buffer, send: packets.Send) => any
    write: (b: Buffer, from: packets.Send) => any
}

export function NewDefaultHttpMonger(): HttpMonger {
    let http: HttpMonger = {
        packer: client.NewDefaultPacketizer(),
        onConnect: (http: HttpMonger) => { },
        onMessage: (http: HttpMonger, b: Buffer) => { },
        write: (b: Buffer, from: packets.Send) => { },
    }
    const prevPacketizerOnConnect = http.packer.onConnect
    http.packer.onConnect = (packer: client.Packetizer) => {
        prevPacketizerOnConnect(packer) // does the connect and the subscribes
        http.onConnect(http)
    }
    var buffer = Buffer.alloc(0)
    http.packer.onPacket = (packer: client.Packetizer, u: packets.Universal) => {

        if (! u) {
            console.log("ERROR http onPacket no packet") // kinda fatal
            return
        }
        const send = packets.FillSend(u)
        if (send === null) {
            if (http.packer.restarter.connectInfo.verbose) {
                const sub = packets.FillSubscribe(u)
                if (sub) {
                    console.log("suback ", sub.optionalKeyValues.get('local-hoster').toString())
                } else {
                    console.log("http onPacket unknown packet", u.toString())
                }
            }
            return
        }
        buffer = Buffer.concat([buffer, Buffer.from(send.Payload)])

        while (true) {
            let contentEndIndex = parseHttp(buffer) // returns -1 if not ready
            if (contentEndIndex < 0) {
                return // not ready yet
            }
            // if we made it this far, we have a complete http packet
            // slice the http packet out of buffer 
            const theHttp = buffer.subarray(0, contentEndIndex)
            buffer = buffer.subarray(contentEndIndex)
            //console.log("HttpMonger theHttp-->"+theHttp.toString()+"<----------")
            //console.log("HttpMonger new buffer-->"+buffer.toString()+"<----------")
            http.onMessage(http, theHttp, send)
        }
    }
    http.onConnect = (http: HttpMonger) => {
        console.log("NewDefaultHttpMonger connected")
        // do we need to do anything on connect?
    }
    http.write = (b: Buffer, from: packets.Send) => {
        console.log("NewDefaultHttpMonger write", b.toString(),
            from.toBackingUniversal().toString())
        // make the entire http message into a packet and send it.
        // FIXME: what it it's too big? We fix that later.
        let send = packets.MakeSend()
        send.Address = from.Source
        send.Source = from.Address
        send.Payload = b
        send.optionalKeyValues = {
            ...from.optionalKeyValues
        }
        http.packer.write(send)
    }
    return http
}

// parseHttp tries to find  a complete http message in the buffer
// returns the length of the complete message or -1 if not ready yet
// TODO: a state machine to enable streaming.
export function parseHttp(buffer: Buffer): number {
    try {
        // console.log("http parsing http", buffer.toString().split("\r\n")[0])
        // parse the buffer for complete http packets
        // including the content 
        let headerEndIndex = buffer.indexOf("\r\n\r\n")
        if (headerEndIndex < 0) {
            return -1// not ready yet
        }
        headerEndIndex += 4
        const theHeader = buffer.subarray(0, headerEndIndex)
        // what's the content length?
        var clenIndex = theHeader.indexOf("Content-Length:")
        if (clenIndex < 0) { // does this ever happen?
            clenIndex = theHeader.indexOf("content-length:")
        }
        let contentLength = 0
        if (clenIndex >= 0) {
            const size = "content-length:".length
            const clenEndIndex = theHeader.indexOf("\r\n", clenIndex)
            let clenStr = theHeader.subarray(clenIndex + size, clenEndIndex).toString()
            clenStr = clenStr.trim()
            contentLength = parseInt(clenStr)
        }
        // TODO: check for chunked encoding
        if (contentLength === 0) {
            // const size = "Transfer-Encoding:".length
            var clenIndex = theHeader.indexOf("Transfer-Encoding:")
            // const clenEndIndex = buffer.indexOf("\r\n", clenIndex)
            // const clenStr = buffer.subarray(clenIndex + size, clenEndIndex).toString()
            // if (clenStr.indexOf("chunked") >= 0) 
            if (clenIndex >= 0) {
                let pos = headerEndIndex
                while (true) {
                    let [aLen, pops] = readChunkLength(buffer, pos)
                    if (aLen < 0) {
                        return -1// http not ready yet
                    }
                    if (aLen === 0) {
                        contentLength = pops - headerEndIndex
                        break
                    }
                    // console.log("chunked encoding part", buffer.subarray(pops, pops + aLen).toString())
                    pos = pops + aLen
                }
            }
            // what happens with gzip?
        }
        const contentEndIndex = headerEndIndex + contentLength
        if (contentEndIndex > buffer.length) {
            return -1// not ready yet
        }
        return contentEndIndex
    } catch (error) {
        console.log("http message short")
        return -1
    }
    return -1
}

// readChunkLength reads the chunk length from a buffer
// starting at pos. pass the \r\n then read the hex number
// then pass the \r\n and return the length and the new position
// at the end we return 0 
// if the buffer isn't big enough, we return -1
function readChunkLength(buffer: Buffer, pos: number): [number, number] {
    let aLen = 0
    let pops = pos
    let c = buffer.readUInt8(pops)
    if (c === 0x0d) { // this gets skipped on the first one
        pops++
        c = buffer.readUInt8(pops++)
        if (c !== 0x0a) {
            // what do we do now?
            console.log("chunked encoding error")
        }
    }
    const numStart = pops
    while (true) { // pass the hex number
        c = buffer.readUInt8(pops)
        if (c <= 0x0d) {
            break
        }
        pops++
    }
    const lenstr = buffer.subarray(numStart, pops).toString()
    aLen = 0
    if (lenstr.length > 0) {
        aLen = parseInt(lenstr, 16)
    }
    c = buffer.readUInt8(pops)
    if (c === 0x0d) {
        pops++
        c = buffer.readUInt8(pops++)
        if (c !== 0x0a) {
            // what do we do now?
            console.log("chunked encoding error")
        }
    }
    // another crlf ? some examples have it.
    if (aLen === 0) { // see https://www.geeksforgeeks.org/http-headers-transfer-encoding/
        // actually, we're supposes to pass some headers now?
        // if there's two crlfs, we're done.
        c = buffer.readUInt8(pops)
        if (c === 0x0d) {
            pops++
            c = buffer.readUInt8(pops++)
            if (c !== 0x0a) {
                // what do we do now?
                console.log("chunked encoding error")
            }
            aLen = 0
        }
    }
    return [aLen, pops]
}

// ReplyMonger opens a socket and listens for http replies.
// the onMessage callback is called when a whole reply is parsed.
export type ReplyMonger = {
    connectInfo: client.ConnectInfo, // the connection info
    onMessage: (monger: ReplyMonger, msg: Buffer) => any,
    httpMonger: HttpMonger,
    send: packets.Send
}

export function NewDefaultReplyMonger(): ReplyMonger {
    let monger: ReplyMonger = {
        connectInfo: {
            ...client.defaultConnectInfo,
        },
        onMessage: (monger: ReplyMonger, msg: Buffer) => { console.log("override msg please", msg.toString()) },
        httpMonger: null,
        send: null
    }
    var buffer = Buffer.alloc(0)
    monger.connectInfo.onMessage = (msg: Uint8Array) => {
        buffer = Buffer.concat([buffer, Buffer.from(msg)])
        while (true) {
            // parse the buffer for complete http packets
            // TODO: a state machine to enable streaming and NOT complete http packets
            let contentEndIndex = parseHttp(buffer) // returns -1 if not ready
            if (contentEndIndex < 0) {
                return // not ready yet
            }
            // if we made it this far, we have a complete http packet
            // slice the http packet out of buffer 
            const theHttp = buffer.subarray(0, contentEndIndex)
            buffer = buffer.subarray(contentEndIndex) // leave the rest in the buffer.
            //console.log("HttpMonger theHttp-->"+theHttp.toString()+"<----------")
            //console.log("HttpMonger new buffer-->"+buffer.toString()+"<----------")
            monger.onMessage(monger, theHttp)
        }
    }
    return monger
}


