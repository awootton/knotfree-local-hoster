
import React, { FC, ReactElement, useEffect } from 'react'

import useFetch from "react-fetch-hook";

import {types} from 'knotfree-ts-lib'
// import * as types from '../knotfree-ts-lib/types'

// TODO: move to lib and unify with net-homepage

export interface NameStatusProps {
    aName: string,
    nameType: string,
    refreshCount: number // force a refresh?

    prefix: string, // eg https://
    serverName : string // eg knotfree.net/
}
export interface NameStatusState {
    status: types.NameStatusType
}
export const NameStatus: FC<NameStatusProps> = (props: NameStatusProps): ReactElement => {

    const name = types.getInternalName(props.aName, props.nameType)
    const url = props.prefix + props.serverName + "api1/getNameStatus?name=" + name + "&refresh=" + props.refreshCount

    console.log('NameStatus url', url)

    const { data: statusResult, isLoading, error } = useFetch(url);

    console.log('NameStatus statusResult', statusResult)

    let status: types.NameStatusType

    function getNameOnline(): ReactElement {
        if (status.Exists) {
            return (
                <>
                    {status.Online ? ' and is online.' : ' and is offline.'}
                </>
            )
        } else {
            return (
                <>.</>
            )
        }
    }

    if (isLoading) {
        return (
            <>
                <p>loading...</p>
            </>
        )
    }
    if (error !== undefined) {
        const str = '' + error
        return (
            <>
                <p>error {str}</p>
            </>
        )
    }
    status = statusResult as types.NameStatusType
    console.log('NameStatus status', status)
    return (
        <>
            <p>
                "{types.getExternalName(props.aName, props.nameType)}"
                {status.Exists ? ' exists, is not available' : ' is available'}
                {getNameOnline()}

            </p>
        </>
    )
}


