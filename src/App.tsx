window.Buffer = window.Buffer || require("buffer").Buffer

import React from "react"
import { ReactElement, FC, useState, useEffect } from "react"
import { Button } from '@mui/material'  // Card,Paper

export default App
import ServerConfigEditor from './ServerConfigEditor'
import './App.css'

interface Props {
}

import * as packets from "./knotprotocol/packets"
import * as types from "./Types"

var addCallFunc = (p: packets.Universal) => { console.log("add call needs OVERRIDE", p.toString()) }

type WindowWithElectron = Window & {
    electronAPI: {
        onUpdateTestTopic: (callback: (value: any) => any) => void
        onLoadConfig: (callback: (value: types.ServerConfigList) => any) => void,
        updateConfig: (value: types.ServerConfigList) => void,
        requestConfig: () => void,
    }
}

var typedwindow = window as unknown as WindowWithElectron
var electronAPI = typedwindow.electronAPI
console.log("electronAPI", electronAPI)

const requestConfig = electronAPI.requestConfig

console.log("onUpdateTestTopic", electronAPI.onUpdateTestTopic)
var onUpdateTestTopic = electronAPI.onUpdateTestTopic
// set our callback in onUpdateTestTopic
onUpdateTestTopic((value) => {
    const p = packets.MakeUniversal(value)
    const pstr = p.toString()
    // console.log("onUpdateTestTopic", pstr)
    addCallFunc(p)
})

export var globalServerConfigList = types.EmptyServerConfigList
console.log("onLoadConfig", electronAPI.onLoadConfig)
var onLoadConfig = electronAPI.onLoadConfig
onLoadConfig((value) => {
    console.log("onConfigLoad called with", value)
    globalServerConfigList = value
    setTimeout(() => {
        globalServerConfigList = value
        refreshConfig(globalServerConfigList)
    }, 1000)
})

export function updateConfig(config: types.ServerConfigList) {
    console.log("updateConfig", config)
    electronAPI.updateConfig(config)
    globalServerConfigList = config
}

function ShowCalls(props: Props): ReactElement {

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

var refreshConfig = (config: types.ServerConfigList) => { console.log("refreshConfig not set") }

function App(): ReactElement {

    const [serverConfigList, setServerConfigList] = useState(globalServerConfigList)
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        refreshConfig = (config: types.ServerConfigList) => {
            console.log("refreshConfig", config)
            const newState = { ...config }
            setServerConfigList(newState)
        }
        return () => { };
    }, [serverConfigList]);

    if (serverConfigList.token == "default-config-token-needs-replacing") {
        requestConfig() // this happens when hot changes are made. The UI swaps but has no config
    }

    function onUpdateConfigButton() {
        console.log("onUpdateConfigButton")
        serverConfigList.token = "revised_token" + Date.now()
        updateConfig(serverConfigList)
        const newState = { ...serverConfigList }
        setServerConfigList(newState)
    }
    function onTokenChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newState = { ...serverConfigList }
        newState.token = e.target.value
        setServerConfigList(newState)
        // updateConfig(serverConfigList)
        setDirty(true)
    }
    function onTokenSave( ) {
        updateConfig(serverConfigList)
        setDirty(false)
    }
    return (
        <div className="likeTypography" >
            <ServerConfigEditor
                serverConfig={serverConfigList}
                onUpdate={(newConfig: types.ServerConfigList) => {
                    console.log("onUpdate called")
                    updateConfig(newConfig)
                    const newState = { ...newConfig }
                    setServerConfigList(newState)
                }}
            />

            Add access token here:
            <input
                className = "token-input"
                type="text"
                placeholder="Name"
                value={serverConfigList.token}
                onChange={onTokenChange}
            />
            <Button disabled = {!dirty} onClick={() => onTokenSave()}>Save Change</Button>

            <div>
            Last message from server was on:<ShowCalls />
            </div>
            {/* Your content here */}
            {/* {JSON.stringify(serverConfigList)}
        <Button onClick={() => onUpdateConfigButton()}>Update Config</Button> */}
        </div>
    );
};

