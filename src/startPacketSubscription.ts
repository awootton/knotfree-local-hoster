
import * as client from "./knotprotocol/client"
import * as httpClient from "./knotprotocol/httpClient"
import * as packets from "./knotprotocol/packets"
import * as types from "./Types"
import * as utils from "./utils"

const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjExMDU1NDMsImlzcyI6Il85c2giLCJqdGkiOiJkdmF3M3oyOG84Ynhxc3E2ZndvengzaHgiLCJpbiI6MTIxNiwib3V0IjoxMjE2LCJzdSI6NjQsImNvIjozMiwidXJsIjoia25vdGZyZWUuaW8vbXF0dCIsInB1YmsiOiJORVVkWlhzUFRELWx4R2VlSFdYRy1vXzl3bGZuX3NCU3FQcVVxekEwSFMwIn0.KLo0z6Rqw9kTGheINSAToGWIa2EdcblyVDmFetlVZ4rrlCtYYg3d9K_sHmaAtbBWiJv-UfUbpQ0mr88XNqZyDQ"

// only call this once ever
export function startTestTopicWatcher(myUpdateTestTopic: (arg: packets.Universal) => void,host:string) {

    let packer = client.NewDefaultPacketizer()
    packer.token = token
    packer.subs = ["testtopic"]// this was a test: ,"testtopic2","testtopic3","testtopic4","testtopic5"]
    packer.restarter.connectInfo.host = host
    packer.restarter.connectInfo.verbose = false

    packer.onPacket = (packer: client.Packetizer, u: packets.Universal) => {
        const u2 = new packets.Universal(u.commandType, u.data)
        // console.log("node has packet", u2.toString())
        myUpdateTestTopic(u)
    }
    client.StartRestarter(packer.restarter)
}

