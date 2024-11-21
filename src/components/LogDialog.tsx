
// a react dialog that shows the log
import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import './LogDialog.css'

import { packets } from 'knotfree-ts-lib'
// import * as packets from '../knotfree-ts-lib/packets'

var logArray: packets.Universal[] = []
export function addLogFunc(u: packets.Universal) {
    let newLogs = [...logArray]
    if (newLogs.length > 100) {
        newLogs.slice(1)
    }
    newLogs.push(u)
    logArray = newLogs
    logsChanged(logArray)
}


var logsChanged = (p: packets.Universal[]) => { console.log("add log needs OVERRIDE", p.toString()) }

interface LogDialogProps {
    open: boolean
    onClose: () => void
}

export const LogDialog: React.FC<LogDialogProps> = (props: LogDialogProps) => {

    const [logs, setLogs] = useState(logArray)

    useEffect(() => {
        logsChanged = (newLogs: packets.Universal[]) => {
            setLogs(newLogs)
        }
        return () => { };
    }, [logs]);

    function packetToMessage(u: packets.Universal): string {
        if (u.commandType == 'S') {
            const sub = packets.FillSubscribe(u)
            if (sub) {
                const suback = sub.optionalKeyValues.get('local-hoster')
                if (suback) {
                    // console.log("have suback " + Buffer.from(suback).toString())
                    return 'suback: ' + Buffer.from(suback).toString()
                } else {
                    return 'unknown suback' + +u.toString()
                }
            } else {
                console.log("unknown S ")
                return 'unknown S ' + u.toString()
            }
        } else if (u.commandType == 'P') { // P is for publish but we call it a 'send' packet.
            const msg = packets.FillSend(u)
            if (msg) {
                return 'msg: ' + packets.Asciiizer(msg.Payload, 32)
            } else {
                return 'unknown P ' + u.toString()
            }
        }
        return 'unknown ' + u
    }
    return (
        <div className='log-dialog'>
            <Dialog open={props.open} onClose={props.onClose} aria-labelledby="log-dialog-title"
                fullWidth >
                <DialogTitle id="Local host connection logs">Logs</DialogTitle>
                <DialogContent dividers>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {logs.map((log, index) => (
                            <div key={index}>{packetToMessage(log)}</div>
                        ))}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={props.onClose} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default LogDialog