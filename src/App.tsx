window.Buffer = window.Buffer || require("buffer").Buffer

import React from "react"
import { ReactElement, FC, useState, useEffect } from "react"
import { Button } from '@mui/material'  // Card,Paper

export default App
import ServerConfigEditor from './ServerConfigEditor'
import './App.css'
import {ShowCalls,addCallFunc} from './components/ShowCalls'
import {LogDialog,addLogFunc} from './components/LogDialog'

import * as starz from './components/StarsDialog'

import {packets} from "knotfree-ts-lib"
import {types} from "knotfree-ts-lib"
import {getFreeToken} from 'knotfree-ts-lib'

// damn you webpack5, bite me.

// import * as packets from './knotfree-ts-lib/packets'
// import * as types from './knotfree-ts-lib/types'
// import {getFreeToken} from './knotfree-ts-lib/AccessTokenPageUtil'


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
    const u = value as packets.Universal
    // const pstr = u.toString()
    // console.log("onUpdateTestTopic", pstr)
    addCallFunc(u)
    addLogFunc(u)
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

var refreshConfig = (config: types.ServerConfigList) => { console.log("refreshConfig not set") }

function App(): ReactElement {

    const [isStars, setIsStars] = React.useState(false);
    const [showLog,setShowLog] = React.useState(false)

    const [serverConfigList, setServerConfigList] = useState(globalServerConfigList)
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        refreshConfig = (config: types.ServerConfigList) => {
            console.log("refreshConfig", config)
            const newState = { ...config }
            setServerConfigList(newState)

            if ( !config.token || config.token.length < 200 ) {
                // we have no token, so request one
                console.log("need to get token")
                getFreeToken("https://","knotfree.net/",(ok: boolean, tok: string) => {
                    if (ok) {
                        console.log("got token",tok)
                    
                        const newState = { ...config,token:tok }
                        setServerConfigList(newState)
                        updateConfig(newState)
                    }
                },config.ownerPublicKey?config.ownerPublicKey:"",
                config.ownerPrivateKey?config.ownerPrivateKey:"")
            }
        }

        return () => { };
    }, [serverConfigList]);

    

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
    function onTokenSave() {
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
                className="token-input"
                type="text"
                placeholder="Name"
                value={serverConfigList.token}
                onChange={onTokenChange}
            />
            <Button disabled={!dirty} onClick={() => onTokenSave()}>Save Change</Button>

            <div>
                Last message from server was on:<ShowCalls />
            </div>
            <Button onClick={() => setShowLog(true)}>Show Log</Button>

            <Button onClick={() => setIsStars(true)}>an egg</Button>

            <LogDialog open = {showLog}
                onClose={()=>setShowLog(false)}
                />

            <starz.StarsDialog 
                open = {isStars}
                title="atw was here"
                onClose={()=>{setIsStars(false)}}
                onConfirm={()=>{}}
            />

        </div>
    );
};

