
import React, { ReactElement, useState, useEffect } from "react"
// import { packets } from 'knotfree-ts-lib'
import * as packets from 'knotfree-ts-lib/src/packets'

// We're getting rid of this one. See LogDialog.

export var addCallFunc = (p: packets.Universal) => { console.log("add call needs OVERRIDE", p.toString()) }

interface Props {
}

export function ShowCalls(props: Props): ReactElement {

    const [calls, setCalls] = useState([])
    const [lastTime, setLastTime] = useState(new Date())

    function updateCallsFuction(p: packets.Universal) {
        // console.log("ShowCalls add call", p.toString())
        if (p.commandType == "P") {

            // todo: make Send class. Meanwhile, the payload is the third string
            const payload = Buffer.from(p.data[2]).toString('utf8')

            var newCalls = [...calls]
            if (newCalls.length > 10) {
                newCalls = newCalls.slice(1)
            }
            newCalls.push(payload)
            setCalls(newCalls)
            setLastTime(new Date())
        }
    }

    useEffect(() => {
        // console.log("ShowCalls useEffect")
        addCallFunc = updateCallsFuction
        return () => { };
    }, [calls]);

    function listCalls(): ReactElement {
        // console.log("listCalls")
        let componentArray = []
        for (let i = 0; i < calls.length; i++) {
            let c = calls[i]
            const somejsx = (<li key={i}>{c.toString()}</li>)
            componentArray.push(somejsx)
        }
        return (
            <>
                {componentArray}
            </>
        )
    }

    return (
        <>
            {lastTime.toLocaleString()}
        </>
        // <div>
        //     <h2>Calls</h2>
        //     <ul>
        //         {listCalls()}
        //     </ul>
        // </div>
    );
}