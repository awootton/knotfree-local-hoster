import React, { useState } from 'react'
import {types} from 'knotfree-ts-lib'
// import { Button } from '@mui/material'
// import { deepStrictEqual } from 'assert'
// import { parse } from 'path'

type Props = {
    serverConfig: types.ServerConfigList
    // tell our parent that we have a new config
    onUpdate: (items: types.ServerConfigList) => void
}

const ServerConfigEditor: React.FC<Props> = (props: Props) => {

    type allStringItem = {
        name: string
        port: string
        host: string
    }

    const [items, setItems] = useState(props.serverConfig.items)
    const [newItem, setNewItem] = useState<allStringItem>({
        name: '',
        port: '',
        host: '127.0.0.1'
    })

    const propsItems = props.serverConfig.items
    if (JSON.stringify(items) != JSON.stringify(propsItems)) {
        setItems(props.serverConfig.items)
    }

    // console.log("ServerConfigEditor props items", props.serverConfig.items)
    // console.log("ServerConfigEditor items", items)


    const [dirty, setDirty] = useState(false);

    const handleAddItem = () => {
        const tmp = {
            name: newItem.name,
            port: parseInt(newItem.port,10),
            host: newItem.host
        }
        const newConfig: types.ServerConfigList = { token: props.serverConfig.token, items: [...items, { ...tmp }] }
        setItems(newConfig.items)
        console.log("handleAddItem items will be", items)
        setNewItem({ name: '', port: '', host: '127.0.0.1' })
        // setDirty(true) // Mark as dirty
        saveChanges(newConfig)
    }

    // this funky technique is not mine. Blame copilot.
    const handleEditNameItem = (index: number, value: string) => {
        const updatedItems = [...items];

        updatedItems[index].name = value

        setItems(updatedItems);
        // ar newConfig: types.ServerConfigList = { token: props.serverConfig.token, items: items }
        //console.log("onUpdate newConfig", newConfig);
        // props.onUpdate(newConfig);
        setDirty(true) // Mark as dirty
    };

    function filterInt(value: string): string {
        // regex new string with just digits
        const newValue = value.replace(/\D/g, '');
        return newValue
    }

    const handleEditPortItem = (index: number, value: string) => {
        const updatedItems = [...items];
        updatedItems[index].port = parseInt(filterInt(value),10)
        setItems(updatedItems);
        // var newConfig: types.ServerConfigList = { token: props.serverConfig.token, items: items }
        //console.log("onUpdate newConfig", newConfig);
        // props.onUpdate(newConfig);
        setDirty(true) // Mark as dirty
    };

    const handleDeleteItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        var newConfig: types.ServerConfigList = { token: props.serverConfig.token, items: newItems }
        console.log("handleDeleteItem newConfig", newConfig);
        setItems(newConfig.items)
        saveChanges(newConfig)
        //setDirty(true) // Mark as dirty
    };

    function saveChanges(newConfig: types.ServerConfigList) {
        console.log("onUpdate newConfig", newConfig);
        props.onUpdate(newConfig);
        // setItems(newConfig.items);
        // setDirty(false); // Reset dirty state
    }

    return (
        <div>
            <h2>Server Config Editor</h2>
            <div>
                <input
                    className = "name-input"
                    type="text"
                    placeholder="Name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
                <input
                    type="text"
                    placeholder="Port"
                    value={newItem.port}
                    onChange={(e) => setNewItem({ ...newItem, port: filterInt(e.target.value) })}
                />
                <button onClick={handleAddItem}>Add Item</button>
                {/* <Button onClick={saveChanges} disabled={!dirty}>Save Changes</Button> */}
            </div>
            <ul>
                {items.map((item, index) => (
                    <li key={index}>
                        <input
                            className = "name-input"
                            type="text"
                            value={item.name}
                            onChange={(e) => handleEditNameItem(index, e.target.value)}
                        />
                        <input
                            type="text"
                            value={item.port}
                            onChange={(e) => handleEditPortItem(index, e.target.value)}
                        />
                        <button onClick={() => handleDeleteItem(index)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ServerConfigEditor;