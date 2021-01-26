import { Button, SimpleDialog, FieldItem, TextField, Checkbox } from "@gui-elements/index";
import PrefixList from "./PrefixList";
import React, { useContext, useState } from "react";
import { SuggestionListContext } from "./SuggestionContainer";
import { IPrefix } from "./suggestion.typings";

interface IProps {
    isOpen: boolean;

    onAdd(e: any, prefix:string);

    onDismiss(e: any);

    prefixList: IPrefix[];

    selectedPrefix: string;
}

export function PrefixDialog({ isOpen, onAdd, onDismiss, prefixList, selectedPrefix }: IProps) {
    const context = useContext(SuggestionListContext);

    const [inputPrefix, setInputPrefix] = useState(selectedPrefix);

    const [withoutPrefix, setWithoutPrefix] = useState(false);

    const handleInputPrefix = (value: string) => setInputPrefix(value);

    const handleAdd = (e) => onAdd(e, inputPrefix);

    const handleNotIncludePrefix = () => {
        const toggledValue = !withoutPrefix;
        if (toggledValue) {
            setInputPrefix('');
        }
        setWithoutPrefix(toggledValue);

    }

    return <SimpleDialog
        isOpen={isOpen}
        portalContainer={context.portalContainer}
        actions={[
            <Button key="confirm" onClick={handleAdd}>
                Confirm
            </Button>,
            <Button key="cancel" onClick={onDismiss}>
                Cancel
            </Button>,
        ]}
    >
        <FieldItem labelAttributes={{text: 'Autogenerated prefix'}}>
            <TextField
                name={'prefix'}
                onChange={(e) => handleInputPrefix(e.target.value)}
                value={inputPrefix}
                disabled={withoutPrefix}
            />
        </FieldItem>
        <PrefixList
            prefixes={prefixList}
            selectedPrefix={selectedPrefix}
            onChange={handleInputPrefix}
            disabled={withoutPrefix}
        />
        <Checkbox
            onChange={handleNotIncludePrefix}
            label={'Not include prefix'}
        />

    </SimpleDialog>
};