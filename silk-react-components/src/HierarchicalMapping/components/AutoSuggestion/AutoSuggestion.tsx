import React from "react";
import CodeMirror from "codemirror";
import { Icon, Spinner, Label } from "@gui-elements/index";

//custom components
import CodeEditor from "../CodeEditor";
import {Dropdown} from "./Dropdown";

//styles
require("./AutoSuggestion.scss");

export enum OVERWRITTEN_KEYS {
    ArrowUp = "ArrowUp",
    ArrowDown = "ArrowDown",
    Enter = "Enter",
    Tab = "Tab",
}

export interface ISuggestion {
    value: string
    label?: string
    description?: string
    query: string
}

const AutoSuggestion = ({
    onEditorParamsChange,
    data,
    checkPathValidity,
    validationResponse,
    pathValidationPending,
    suggestionsPending,
    label,
}) => {
    const [value, setValue] = React.useState("");
    const [inputString, setInputString] = React.useState("");
    const [cursorPosition, setCursorPosition] = React.useState(0);
    const [coords, setCoords] = React.useState({ left: 0 });
    const [shouldShowDropdown, setShouldShowDropdown] = React.useState(false);
    const [replacementIndexesDict, setReplacementIndexesDict] = React.useState(
        {}
    );
    const [suggestions, setSuggestions] = React.useState<ISuggestion[]>([]);
    const [markers, setMarkers] = React.useState([]);
    const [
        editorInstance,
        setEditorInstance,
    ] = React.useState<CodeMirror.Editor>();
    const [isFocused, setIsFocused] = React.useState(false);

    const [currentIndex, setCurrentIndex] = React.useState<number>(0);
    const [keyPressCounter, setKeyPressCounter] = React.useState(0);
    const [
        keyPressedFromEditor,
        setKeyPressedFromEditor,
    ] = React.useState<OVERWRITTEN_KEYS>();

    const valueRef = React.useRef("");
    const pathIsValid = validationResponse?.valid ?? true;

    //handle keypress
    React.useEffect(() => {
        makeDropDownRespondToKeyPress(keyPressedFromEditor);
    }, [keyPressCounter]);

    //handle linting
    React.useEffect(() => {
        const parseError = validationResponse?.parseError;
        if (parseError) {
            clearMarkers();
            const { offset, inputLeadingToError, message } = parseError;
            const start = inputLeadingToError.length > 1 ? offset - inputLeadingToError.length + 1 : offset
            const end = offset + 2;
            const marker = editorInstance.markText(
                { line: 0, ch: start },
                { line: 0, ch: end },
                { className: "ecc-text-error-highlighting" }
            );
            setMarkers((previousMarkers) => [...previousMarkers, marker]);
        }
    }, [validationResponse?.parseError]);

    /** generate suggestions and also populate the replacement indexes dict */
    React.useEffect(() => {
        let newSuggestions: ISuggestion[] = [];
        let newReplacementIndexesDict = {};
        if (
            data?.replacementResults?.length === 1 &&
            !data?.replacementResults[0]?.replacements?.length
        ) {
            setShouldShowDropdown(false);
        }
        if (data?.replacementResults?.length) {
            data.replacementResults.forEach(
                ({ replacements, replacementInterval: { from, length }, extractedQuery }) => {
                    const replacementsWithMetaData = replacements.map(r => ({...r, query: extractedQuery}))
                    newSuggestions = [...newSuggestions, ...replacementsWithMetaData];
                    replacements.forEach((replacement) => {
                        newReplacementIndexesDict = {
                            ...newReplacementIndexesDict,
                            [replacement.value]: {
                                from,
                                length,
                            },
                        };
                    });
                }
            );
            setSuggestions(newSuggestions);
            setReplacementIndexesDict(newReplacementIndexesDict)
        }
    }, [data]);

    React.useEffect(() => {
        if (isFocused) {
            setInputString(() => value);
            setShouldShowDropdown(true);
            //only change if the input has changed, regardless of the cursor change
            if (valueRef.current !== value) {
                checkPathValidity(value);
                valueRef.current = value;
            }
            onEditorParamsChange(inputString, cursorPosition);
        }
    }, [cursorPosition, value, inputString, isFocused]);

    const handleChange = (val) => {
        setValue(val);
    };

    const handleCursorChange = (pos, coords) => {
        setCursorPosition(pos.ch);
        setCoords(() => coords);
    };

    const handleInputEditorKeyPress = (event: KeyboardEvent) => {
        const overWrittenKeys: Array<string> = Object.values(OVERWRITTEN_KEYS);
        if (overWrittenKeys.includes(event.key)) {
            event.preventDefault();
            setKeyPressedFromEditor(OVERWRITTEN_KEYS[event.key]);
            setKeyPressCounter((counter) => ++counter);
        }
    };

    const handleTextHighlighting = (focusedSuggestion: string) => {
        const indexes = replacementIndexesDict[focusedSuggestion];
        if (indexes) {
            clearMarkers();
            const { from, length } = indexes;
            const to = from + length;
            const marker = editorInstance.markText(
                { line: 0, ch: from },
                { line: 0, ch: to },
                { className: "ecc-text-highlighting" }
            );
            setMarkers((previousMarkers) => [...previousMarkers, marker]);
        }
    };

    //remove all the underline highlighting
    const clearMarkers = () => {
        markers.forEach((marker) => marker.clear());
    };

    const handleDropdownChange = (selectedSuggestion: string) => {
        const indexes = replacementIndexesDict[selectedSuggestion];
        if (indexes) {
            const { from, length } = indexes;
            const to = from + length;
            setValue(
                (value) =>
                    `${value.substring(
                        0,
                        from
                    )}${selectedSuggestion}${value.substring(to)}`
            );
            setShouldShowDropdown(false);
            editorInstance.setCursor({ line: 0, ch: to });
            editorInstance.focus();
            clearMarkers();
        }
    };

    const handleInputEditorClear = () => {
        setValue("");
    };

    const handleInputFocus = (focusState: boolean) => {
        setIsFocused(focusState);
        setShouldShowDropdown(focusState);
    };

    //keyboard handlers
    const handleArrowDown = () => {
        const lastSuggestionIndex = suggestions.length - 1;
        let nextIndex;
        if (currentIndex === lastSuggestionIndex) {
            nextIndex = 0;
            setCurrentIndex(nextIndex);
            handleTextHighlighting(suggestions[nextIndex]?.value);
        } else {
            setCurrentIndex((index) => {
                nextIndex = ++index;
                handleTextHighlighting(suggestions[nextIndex]?.value);
                return nextIndex;
            });
        }
    };

    const handleArrowUp = () => {
        const lastSuggestionIndex = suggestions.length - 1;
        let nextIndex;
        if (currentIndex === 0) {
            nextIndex = lastSuggestionIndex;
            setCurrentIndex(nextIndex);
            handleTextHighlighting(suggestions[nextIndex]?.value);
        } else {
            setCurrentIndex((index) => {
                nextIndex = --index;
                handleTextHighlighting(suggestions[nextIndex]?.value);
                return nextIndex;
            });
        }
        const chosenSuggestion = suggestions[nextIndex]?.value;
        handleTextHighlighting(chosenSuggestion);
    };

    const handleEnterPressed = () => {
        handleDropdownChange(suggestions[currentIndex]?.value);
        setCurrentIndex(0);
    };

    const handleTabPressed = () => {
        handleDropdownChange(suggestions[currentIndex]?.value);
    };

    const makeDropDownRespondToKeyPress = (keyPressedFromInput) => {
        if (shouldShowDropdown) {
            switch (keyPressedFromInput) {
                case OVERWRITTEN_KEYS.ArrowUp:
                    handleArrowUp();
                    break;
                case OVERWRITTEN_KEYS.ArrowDown:
                    handleArrowDown();
                    break;
                case OVERWRITTEN_KEYS.Enter:
                    handleEnterPressed();
                    break;
                case OVERWRITTEN_KEYS.Tab:
                    handleTabPressed();
                    break;
                default:
                    //do nothing
                    null;
            }
        }
    };

    return (
        <div className="ecc-auto-suggestion-box">
            <Label text={label} />
            <div className="ecc-auto-suggestion-box__editor-box">
                <div className="ecc-auto-suggestion-box__validation">
                    {pathValidationPending && (
                        <Spinner size="tiny" position="local" />
                    )}
                    {!pathIsValid && !pathValidationPending ? (
                        <Icon
                            small
                            className="editor__icon error"
                            name="operation-clear"
                        />
                    ) : null}
                </div>
                <CodeEditor
                    mode="null"
                    setEditorInstance={setEditorInstance}
                    onChange={handleChange}
                    onCursorChange={handleCursorChange}
                    value={value}
                    onFocusChange={handleInputFocus}
                    handleSpecialKeysPress={handleInputEditorKeyPress}
                />
                <div onClick={handleInputEditorClear}>
                    <Icon
                        small
                        className="editor__icon clear"
                        name="operation-clear"
                    />
                </div>
            </div>
            <Dropdown
                left={coords.left}
                loading={suggestionsPending}
                options={suggestions}
                isOpen={shouldShowDropdown}
                onItemSelectionChange={handleDropdownChange}
                currentlyFocusedIndex={currentIndex}
            />
        </div>
    );
};

export default AutoSuggestion;