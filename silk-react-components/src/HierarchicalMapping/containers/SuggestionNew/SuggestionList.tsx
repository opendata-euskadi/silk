import React, {useContext, useEffect, useState} from 'react';
import {
    AlertDialog,
    Button,
    CardActions,
    Notification,
    Pagination,
    Spacing,
    Spinner,
    Table,
} from '@gui-elements/index';
import {
    IAddedSuggestion,
    IPageSuggestion,
    IPlainObject,
    IPrefix,
    ISortDirection,
    ITableHeader,
    ITargetWithSelected,
    ITransformedSuggestion
} from "./suggestion.typings";
import _ from 'lodash';
import paginate from "../../utils/paginate";
import
    STableBody from "./SuggestionTable/STableBody";
import STableHeader from "./SuggestionTable/STableHeader";
import {SuggestionListContext} from "./SuggestionContainer";
import {PrefixDialog} from "./PrefixDialog";
import {filterRowsByColumnModifier, getLocalNameLabelFromPath, sortRows} from "./utils";
import AppliedFilters from "./AppliedFilters";
import {Set} from "immutable"
import {LOCAL_STORAGE_KEYS, MAPPING_DEFAULTS} from "./constants";

interface IPagination {
    // store current page number
    page: number;
    // store page size
    pageSize: number;
}

interface IProps {
    // received native data from backend
    rows: ITransformedSuggestion[];

    // prefix list for autogenerated properties
    prefixList: IPrefix[];

    loading: boolean;

    // call parent action during column (source->target) swap
    onSwapAction();

    // call parent discard(cancel) action
    onAskDiscardChanges();

    // Close suggestions (when nothing is selected)
    onClose()

    // call parent add action
    onAdd(selected: IAddedSuggestion[], selectedPrefix: string);
}

const defaultPrefix = {key: 'default', uri: MAPPING_DEFAULTS.DEFAULT_URI_PREFIX}

export default function SuggestionList({rows, prefixList, loading, onSwapAction, onAskDiscardChanges, onAdd, onClose}: IProps) {
    const context = useContext(SuggestionListContext);
    const [prefixes, setPrefixes] = useState<IPrefix[]>([...prefixList, defaultPrefix])

    useEffect(() => {
        setPrefixes([...prefixList, defaultPrefix])
    }, [prefixList.length])

    const [headers, setHeaders] = useState<ITableHeader[]>(
        [
            {header: 'Source data', key: 'source'},
            {header: null, key: 'SWAP_BUTTON'},
            {header: 'Target data', key: 'target',},
            {header: 'Mapping type', key: 'type'}
        ]
    );

    // store all (post-processed) results, i.e. of all pages
    const [allRows, setAllRows] = useState<IPageSuggestion[]>([]);

    // store rows for current page
    const [pageRows, setPageRows] = useState<IPageSuggestion[]>([]);

    // store all filtered rows by column
    const [filteredRows, setFilteredRows] = useState<IPageSuggestion[]>([]);

    // pagination info
    const [pagination, setPagination] = useState<IPagination>({
        page: 1,
        pageSize: 25
    });

    // stored selected source labels or uris
    const [selectedSources, setSelectedSources] = useState<Set<string>>(Set<string>());

    // store hashmap for source->target, invert values on swap action
    const [sourceToTargetMap, setSourceToTargetMap] = useState<IPlainObject>({});

    // store hashmap for target->type, replace target with source on swap action
    const [targetToTypeMap, setTargetToTypeMap] = useState<any>({});

    // keep sort directions for columns
    const [sortDirections, setSortDirections] = useState<ISortDirection>({
        column: '',
        modifier: false
    });

    // contain columns filters
    const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>({});

    // show the warning dialog when user try to swap the columns,for autogenerated properties
    const [warningDialog, setWarningDialog] = useState<boolean>(false);

    // show the prefix modal when add the autogenerated values
    const [prefixModal, setPrefixModal] = useState(false);

    // The (last) selected URI prefix for auto-generated properties.
    const preSelectedUriPrefix = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_PREFIX) || MAPPING_DEFAULTS.DEFAULT_URI_PREFIX

    useEffect(() => {
        const arr = [];

        rows.forEach((row) => {
            const {candidates} = row;

            // add _selected field for each target
            const modifiedTarget = candidates.map(targetItem => ({
                ...targetItem,
                _selected: false
            }));

            // store modified source,target
            const modifiedRow: IPageSuggestion = {
                ...row,
                candidates: modifiedTarget,
            };

            // keep changes for selected items only after swap action
            if (selectedSources.has(row.uri)) {
                modifiedRow.candidates = modifiedRow.candidates.map(targetItem => {
                    const {label, description, uri, type, confidence} = targetItem;
                    return {
                        uri,
                        confidence,
                        label,
                        description,
                        type: targetToTypeMap[uri] || type,
                        _selected: sourceToTargetMap[row.uri] === uri
                    }
                });
            }

            if (context.isFromDataset) {
                modifiedRow.candidates.push({
                    uri: ``,
                    label: `Auto-generated property`,
                    description: 'The property is auto-generated based on the selected URI prefix and the source path or label. The selected prefix can be changed on submit.' +
                        ' The generated URI will currently be similar to ' + `"${preSelectedUriPrefix}${encodeURIComponent(getLocalNameLabelFromPath(row.uri))}".`,
                    type: 'value',
                    _selected: !modifiedRow.candidates.length,
                    _autogenerated: true,
                    confidence: 1
                });
            }

            // in case nothing selected, then select first item
            const someSelected = modifiedRow.candidates.some(t => t._selected);
            if (!someSelected) {
                modifiedRow.candidates[0]._selected = true;
            }

            arr.push(modifiedRow);
        });

        setAllRows(arr);

        const filteredRows = filterRowsByColumnModifier(columnFilters, selectedSources, arr);
        setFilteredRows(filteredRows);

        const ordered = sortRows(filteredRows, sortDirections, context.isFromDataset);
        setPageRows(
            paginate(ordered, pagination)
        );

    }, [rows, preSelectedUriPrefix]);

    // update the source -> target and target->map relactions on swap
    const updateRelations = (source, targets: ITargetWithSelected[]) => {
        const {uri, type} = targets.find(t => t._selected);

        setSourceToTargetMap(prevState => ({
            ...prevState,
            [source]: uri
        }));

        setTargetToTypeMap(prevState => ({
            ...prevState,
            [uri]: type
        }));
    };

    const toggleRowSelect = ({uri, candidates}: IPageSuggestion) => {
        if (selectedSources.has(uri)) {
            setSelectedSources(
                selectedSources.delete(uri)
            );
        } else {
            setSelectedSources(prevState => prevState.add(uri));
            updateRelations(uri, candidates);
        }
    };

    const toggleSelectAll = (scope: 'all' | 'page', action: 'select' | 'unselect') => {
        const scopeRows = scope === 'all' ? allRows : pageRows;
        if (action === 'select') {
            setSelectedSources(Set(
                    scopeRows.map(row => {
                        updateRelations(row.uri, row.candidates);
                        return row.uri;
                    })
                )
            );
        } else {
            if (scope === 'all')  {
                setSelectedSources(Set());
            } else {
                const pageRowSources = pageRows.map(r => r.uri);
                setSelectedSources(
                    selectedSources.filter(row => !pageRowSources.includes(row))
                );
            }
        }
    };

    const handlePageChange = (pagination: IPagination) => {
        setPagination(pagination);
        setPageRows(
            paginate(filteredRows, pagination)
        );
    };

    // this function called from prefixDialog and from save button
    // when prefix is not presented then open modal for autogenrated properties
    // otherwise save prefix in localstorage
    const handleAdd = (e, prefix?: string) => {
        const addedRows = selectedSources.map(source => {
            const found = allRows.find(row => row.uri === source);
            if (found) {
                const target = found.candidates.find(t => t._selected);
                return {
                    source,
                    targetUri: target.uri,
                    type: target.type
                }
            }
        });

        const isAutogeneratedPresents = addedRows.some(
            // autogenerated values contains empty uri
            row => row.targetUri === ''
        );

        if (isAutogeneratedPresents) {
          if (typeof prefix === 'undefined') {
              setPrefixModal(true);
              return;
          }  else {
              localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_PREFIX, prefix);
          }
        }

        onAdd(addedRows.toArray(), prefix);
    }

    const handleSort = (headerKey: string) => {
        let direction: any = 'asc';
        if (sortDirections.column === headerKey) {
            direction = sortDirections.modifier === false
                ? 'asc'
                : sortDirections.modifier === 'asc' ? 'desc' : false;
        }

        let sortedArray = [...filteredRows];
        const newDirection: ISortDirection = {
            column: '',
            modifier: false
        };

        if (direction !== false) {
            newDirection.column = headerKey;
            newDirection.modifier = direction;

            sortedArray = sortRows(filteredRows, newDirection, context.isFromDataset);
        }
        setSortDirections(newDirection);

        setPageRows(
            paginate(sortedArray, pagination)
        );
    };

    const handleFilterColumn = (columnName: string, action: string, forceRemove?: boolean) => {
        let colFilters = {...columnFilters};
        if (colFilters[columnName] === action || forceRemove) {
            delete colFilters[columnName]
        } else {
            colFilters[columnName] = action;
        }

        setColumnFilters(colFilters);

        const filteredRows = filterRowsByColumnModifier(colFilters, selectedSources, allRows);
        setPageRows(
            paginate(filteredRows, pagination)
        );
        setFilteredRows(filteredRows);
    };

    const handleSwap = () => {
        const isAutogeneratedSelected = selectedSources.some(source => {
            const found = allRows.find(row => row.uri === source);
            if (found) {
                const {_autogenerated} = found.candidates.find(t => t._selected);
                return _autogenerated;
            }
        });

        if (isAutogeneratedSelected) {
            setWarningDialog(true);
            return;
        }

        handleConfirmSwap();
    };

    const handleConfirmSwap = () => {
        const targetsAsSelected = selectedSources.map(source => {
            const found = allRows.find(row => row.uri === source);
            if (found) {
                const {uri, _autogenerated} = found.candidates.find(t => t._selected);
                if (_autogenerated) {
                    return null;
                }
                return uri;
            }
        }).filter(Boolean);

        setSelectedSources(targetsAsSelected);

        // reset preview rows
        setPageRows([]);

        const sourceToType = {};
        const targetToSource = _.invert(sourceToTargetMap);

        _.forEach(targetToTypeMap, (value, key) => {
            const source = targetToSource[key];
            sourceToType[source] = value;
        });

        setSourceToTargetMap(targetToSource);
        setTargetToTypeMap(sourceToType);

        // swap header columns
        const temp = headers[0];
        headers[0] = headers[2];
        headers[2] = temp;

        setHeaders(headers);

        setWarningDialog(false);

        onSwapAction();
    };

    // modify suggestion.candidates[] fields
    const handleModifyTarget = (row: IPageSuggestion, targets: ITargetWithSelected[]) => {
        const _allRows = [...allRows];
        const ind = _allRows.findIndex(r => r.uri === row.uri);

        if (ind > -1) {
            updateRelations(row.uri, targets);

            _allRows[ind].candidates = targets;

            setAllRows(_allRows);
        }
    }

    const isAllSelected = () => filteredRows.length && pageRows.length === selectedSources.size;

    return loading ? <Spinner/> :
        <>
            {!!Object.keys(columnFilters).length &&
                <AppliedFilters
                    filters={columnFilters}
                    onRemove={(key) => handleFilterColumn(key, '', true)}
                />
            }
            {
                <>
                    <Table style={{tableLayout: "fixed"}}>
                        <colgroup>
                            <col style={{width: "60px"}} />
                            <col style={{width: headers[0].key === "source" ? "15em" : "20em"}} />
                            <col style={{width: "60px"}} />
                            <col style={{width: headers[0].key === "source" ? "20em" : "15em"}} />
                            <col style={{width: "10em"}} />
                        </colgroup>
                        <STableHeader
                            headers={headers}
                            isAllSelected={isAllSelected()}
                            toggleSelectAll={toggleSelectAll}
                            onSwap={handleSwap}
                            onSort={handleSort}
                            onApplyFilter={handleFilterColumn}
                            sortDirections={sortDirections}
                            appliedFilters={columnFilters}
                            ratioSelection={selectedSources.size / rows.length}
                        />
                        {
                            filteredRows.length > 0 && <STableBody
                                pageRows={pageRows}
                                selectedSources={selectedSources}
                                toggleRowSelect={toggleRowSelect}
                                onModifyTarget={handleModifyTarget}
                            />
                        }
                    </Table>
                    { filteredRows.length === 0 && <><Spacing size="tiny" /><Notification>No results found.</Notification></> }
                </>
            }
            {
                filteredRows.length > 0 && (
                    <Pagination
                        onChange={handlePageChange}
                        totalItems={filteredRows.length}
                        pageSizes={[5, 10, 25, 50, 100]}
                        page={pagination.page}
                        pageSize={pagination.pageSize}
                        backwardText={"Previous page"}
                        forwardText={"Next page"}
                        itemsPerPageText={"Items per page:"}
                        itemRangeText={(min, max, total) => `${min}–${max} of ${total} items`}
                        pageRangeText={(current, total) => `of ${total} pages`}
                    />
                )
            }
            <Spacing size="small"/>
            <CardActions>
                <Button affirmative={allRows.length > 0} disabled={allRows.length < 1 || selectedSources.size === 0} onClick={handleAdd} data-test-id='add_button'>
                    Add ({selectedSources.size})
                </Button>
                <Button onClick={() => selectedSources.size > 0 ? onAskDiscardChanges() : onClose()}>Cancel</Button>
            </CardActions>
            <AlertDialog
                warning={true}
                isOpen={warningDialog}
                portalContainer={context.portalContainer}
                onClose={() => setWarningDialog(false)}
                actions={[
                    <Button key="confirm" onClick={handleConfirmSwap}>
                        Swap
                    </Button>,
                    <Button key="cancel" onClick={() => setWarningDialog(false)}>
                        Cancel
                    </Button>,
                ]}
            >
                <p>The selected auto-generated properties lost after swap.</p>
                <p>Are you sure?</p>
            </AlertDialog>
            <PrefixDialog
                isOpen={prefixModal}
                onAdd={handleAdd}
                onDismiss={() => setPrefixModal(false)}
                prefixList={prefixes}
                selectedPrefix={preSelectedUriPrefix}
            />
        </>
}
