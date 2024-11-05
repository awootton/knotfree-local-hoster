// Copyright 2024 Alan Tracey Wootton
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// import { Buffer } from 'buffer' // for stinky react native 

import net from "net";
import * as packets from "./packets"
import { isAscii } from "buffer";

// this implements a client of the native knotfree protocol.
// see ./packets.tsx for the wire format
// see ../test/testKnotConnect.ts for example usage

export type ConnectInfo = {
    private_client_not_for_use: net.Socket,
    host: string,
    port: number,
    onConnect: () => any,
    onDisconnect: (err: Error) => any,
    onMessage: (msg: Uint8Array) => any,
    verbose?: boolean,
    verboseRaw?: boolean,

    write: (msg: Uint8Array, logMessage: string) => any
}

export const defaultConnectInfo: ConnectInfo = {
    private_client_not_for_use: undefined,
    port: 8384,
    host: "knotfree.com", // localhost in my /etc/hosts
    onConnect: () => { },
    onDisconnect: (err: Error) => { },// unused ?
    onMessage: (msg: Uint8Array) => { console.log("override msg please", msg.toString()) },
    verbose: false,
    verboseRaw: false,
    write: (msg: Uint8Array) => { }
}

export type Restarter = {
    connectInfo: ConnectInfo,
    onConnect: (r: Restarter) => any,
    onDisconnect: (r: Restarter, err: Error) => any,
    onMessage: (r: Restarter, msg: Uint8Array) => any,
    dontReconnect: boolean // so the tests can ever end.
}

export function NewDefaultRestarter(): Restarter {
    let r: Restarter = {
        connectInfo: {
            ...defaultConnectInfo,
        },
        onConnect: OnConnectFunction,
        onDisconnect: (r: Restarter, err: Error) => { },
        onMessage: (r: Restarter, msg: Uint8Array) => { console.log("Restarter onMessage", msg.toString()) },
        dontReconnect: false
    }
    r.connectInfo.onConnect = () => {
        r.onConnect(r)
    }
    r.connectInfo.onMessage = (msg: Uint8Array) => {
        r.onMessage(r, msg)
    }
    r.connectInfo.onDisconnect = (err: Error) => {
        r.onDisconnect(r, err)
    }
    // TODO: declare them all like this:
    function OnConnectFunction() {
        console.log("Restarter connected")
    }
    r.onDisconnect = (r: Restarter, err: Error) => {
        console.log("disconnected")
        r.connectInfo.private_client_not_for_use.destroy(err)
        // wait a bit and try again
        if (!r.dontReconnect) {
            setTimeout(() => {
                Startup(r.connectInfo)
            }, 10 * 1000)
        }
    }
    return r
}

export function StartRestarter(restarter: Restarter) {
    Startup(restarter.connectInfo)
}

// reads and writes to the socket
export type Packetizer = {
    restarter: Restarter,
    onConnect: (packer: Packetizer) => any,
    onPacket: (packer: Packetizer, u: packets.Universal) => any
    write: (p: packets.PacketCommon) => any

    token: string,
    subs: string[],

    doSubscriptions: (packer: Packetizer) => any
}

export function NewDefaultPacketizer(): Packetizer {
    let packer: Packetizer = {
        restarter: NewDefaultRestarter(),
        onConnect: onConnectFunction,
        onPacket: (packer: Packetizer, u: packets.Universal) => { console.log("override msg please") },
        write: (p: packets.PacketCommon) => { console.log("override write please", p.toString()) },
        token: "",
        subs: [],
        doSubscriptions: doSubscriptionsFunction
    }
    packer.restarter.onConnect = (r: Restarter) => {
        packer.onConnect(packer)
    }
    var buffer = Buffer.alloc(0)
    packer.restarter.onMessage = (r: Restarter, msg: Uint8Array) => {
        buffer = Buffer.concat([buffer, Buffer.from(msg)])
        let u: packets.Universal
        [u, buffer] = packets.FromBuffer(buffer)
        // unmarshal the packet

        if (u) {
            // if (packer.restarter.connectInfo.verbose) {
            //     console.log("packetizer have packet", packets.Asciiizer(Buffer.from(u.toString()), 256))
            // }
            packer.onPacket(packer, u)
        } else {
            //if (packer.restarter.connectInfo.verbose)
                // ?? console.log("packetizer only had partial packet")
        }
    }

    let connected = false
    function onConnectFunction(packer: Packetizer) {
        connected = true
        console.log("NewDefaultPacketizer connected")
        // needs to send a connect packet
        let connect = packets.MakeConnect()
        connect.optionalKeyValues.set("token", Buffer.from(packer.token))
        //setTimeout(() => {
        packer.write(connect)
        //},1)
        console.log("packer onConnect")
        packer.doSubscriptions(packer)
    }
    function doSubscriptionsFunction(packer: Packetizer) {
        if (!connected) {
            return
        }
        let i = 1
        for (let s of packer.subs) {
            let sequence = i
            setTimeout(() => {
                // console.log("packer subscribing to", s, sequence)
                let sub = packets.MakeSubscribe()
                sub.Address = { Type: ' ', Bytes: Buffer.from(s) }
                // sub.optionalKeyValues.set('debg', Buffer.from("12345678")) // causes debg logging in the knotfree server
                sub.optionalKeyValues.set('local-hoster', Buffer.from(s))
                packer.write(sub)
            }, i * 100)
            i++
        }
    }
    packer.write = (p: packets.PacketCommon) => {
        let logMessage = ''
        if (packer.restarter.connectInfo.verbose) {
            if (p.backingUniversal.commandType === 'P') {
                p.toBackingUniversal()
                let send = packets.FillSend(p.backingUniversal)
                let payload = Buffer.from(send.Payload)
                let msg = packets.Asciiizer(payload, 256)
                logMessage = msg// console.log("Packetizer writing Send to socket:" + msg)
            } else {
                p.toBackingUniversal()
                logMessage = p.backingUniversal.toString()
                //console.log("Packetizer writing to socket", p.backingUniversal.toString())
            }
        }
        const data = packets.PacketToBytes(p)
        packer.restarter.connectInfo.write(data, logMessage)
    }
    return packer
}

// Startup starts the TCP client.
export function Startup(params: ConnectInfo) {

    params.private_client_not_for_use = new net.Socket()

    // we only write whole packets so we can setNoDelay.
    params.private_client_not_for_use.setNoDelay(true)
    // params.client.setKeepAlive(true)

    params.private_client_not_for_use.connect(params.port, params.host)

    params.private_client_not_for_use.on('connect', params.onConnect)

    params.private_client_not_for_use.on('error', (err) => {
        console.log('Client: error: ' + err.message)
    })

    params.private_client_not_for_use.on('close', (b: boolean) => {
        if (params.verbose == true) {
            console.log('Client: close: ' + b)
        }
        let err2 = new Error("Client: close: " + b)
        params.private_client_not_for_use.destroy(err2)
        params.onDisconnect(err2)
    })

    params.private_client_not_for_use.on('data', (msg: Uint8Array) => {
        if (params.verboseRaw) {
            let bytes = packets.Asciiizer(Buffer.from(msg), 512)
            console.log('Client received data ====>' + bytes + '<====')
        }
        params.onMessage(msg)
    })

    // A fifo queue of Uint8Array to send
    type qitem = {
        msg: Uint8Array,
        logMessage: string
    }
    var sendQueue: qitem[] = []
    var haveTimer = false

    function setTimer() {
        if (!haveTimer) {
            setTimeout(() => {
                haveTimer = false
                // ? if the output is full we should wait. How?
                let item = sendQueue.shift()
                if (params.verbose) {
                    let bytes = packets.Asciiizer(Buffer.from(item.msg), 256)
                    if (params.verboseRaw) {
                        console.log('Client sending ====>' + bytes + '<====')
                    }
                    // console.log('Client sending', item.logMessage)
                }
                // This is the write to the socket
                // Too many, too fast, will cause replies to buffer in a weird way
                let ok = params.private_client_not_for_use.write(item.msg, dataDone)
                if (!ok) {
                    console.log("write ok", ok)
                }
                function dataDone(err: Error) {
                    if (err) {
                        console.log('dataDone : error: ' + err.message)
                    } else {
                        // console.log('dataDone : ok')
                    }
                    if (sendQueue.length > 0) {
                        setTimer()// again
                    }
                }
            }, 10)
            haveTimer = true
        }
    }

    params.write = (msg: Uint8Array, logMessage: string) => {
        // it seems to be a problem to write in the same thread as a read or a connect.
        // console.log("write qing", logMessage)
        sendQueue.push({ msg: msg, logMessage: logMessage })
        setTimer()
    }

}