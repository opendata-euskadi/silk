// @TODO: can be moved to another place as a utils
import {
    IPageSuggestion,
    ISortDirection,
    ISuggestionCandidate,
    ITargetWithSelected,
    ITransformedSuggestion
} from "./suggestion.typings";
import {FILTER_ACTIONS} from "./constants";
import _ from "lodash";
import {Set} from "immutable"

export const filterRowsByColumnModifier = (filters: {[key: string]: string}, selectedSources: Set<string>, rows: IPageSuggestion[]): IPageSuggestion[] => {
    let filteredResults = [...rows];

    Object.values(filters).forEach(filter => {
        switch (filter) {
            case FILTER_ACTIONS.SHOW_SELECTED:
            case FILTER_ACTIONS.SHOW_UNSELECTED: {
                filteredResults = filteredResults.filter(
                    row => filter === FILTER_ACTIONS.SHOW_SELECTED
                        ? selectedSources.has(row.uri)
                        : !selectedSources.has(row.uri)
                );
                break;
            }

            case FILTER_ACTIONS.SHOW_MATCHES:
            case FILTER_ACTIONS.SHOW_GENERATED: {
                filteredResults = filteredResults.filter(row => {
                    const selected = selectedCandidate(row)
                    return filter === FILTER_ACTIONS.SHOW_GENERATED
                        ? selected._autogenerated
                        : !selected._autogenerated
                });
                break;
            }

            case FILTER_ACTIONS.SHOW_VALUE_MAPPINGS:
            case FILTER_ACTIONS.SHOW_OBJECT_MAPPINGS: {
                const type = filter === FILTER_ACTIONS.SHOW_VALUE_MAPPINGS ? 'value' : 'object';
                filteredResults = filteredResults.filter(row => {
                    const selected = selectedCandidate(row)
                    return selected.type === type
                });
                break;
            }

            default:
                break;
        }
    });

    return filteredResults;
};

/** Returns the input rows sorted by the requested sort direction.
 *
 * @param rows  The rows that should be sorted.
 * @param sortDirections The column and direction to sort by.
 * @param fromDataset Is the dataset or target vocabulary view active.
 */
export const sortRows = (rows: IPageSuggestion[], sortDirections: ISortDirection, fromDataset: boolean) => {
    const {column, modifier} = sortDirections;
    let sortFn = (item: IPageSuggestion): string | -1 => item[column];

    const sortByTargetColumn = column === 'target';
    const sortBySourceColumn = column === 'source'
    if (fromDataset && sortByTargetColumn || !fromDataset && sortBySourceColumn) {
        // Sorts the selected item in the 3. "target" column
        sortFn = (candidate: IPageSuggestion) => {
            const selected = selectedCandidate(candidate)
            return selected._autogenerated ? -1 : itemLabel(selected)
        }
    } else if(column === 'type') {
        // Type column sorter
        sortFn = (candidate) => selectedCandidate(candidate).type
    } else if(fromDataset && sortBySourceColumn || !fromDataset && sortByTargetColumn) {
        // Sorts the items in the 1. "source" column
        sortFn = (candidate: IPageSuggestion) => itemLabel(candidate)
    }
    const lowerCasedSort = (candidate: IPageSuggestion) => {
        const sortValue = sortFn(candidate)
        return !sortValue || sortValue === -1 ? -1 : sortValue.toLowerCase()
    }
    return _.orderBy(rows, lowerCasedSort, modifier as 'asc' | 'desc');
};

// Returns the item label
const itemLabel = (item: ITransformedSuggestion | ISuggestionCandidate): string => {
    return item.label ? item.label : item.uri;
}

// Returns the selected candidate or the first entry if no entry is marked as selected.
export const selectedCandidate = (target: IPageSuggestion): ITargetWithSelected => {
    if(target.candidates.length > 0) {
        const selected = target.candidates.filter((candidate) => candidate._selected)
        if(selected.length > 0) {
            return selected[0]
        } else {
            return target.candidates[0]
        }
    } else {
        return undefined
    }
}

const pathSplitRegex = /[\/\\#:]+/g
const unAllowedChars = /[<>]/g

/** Returns a path string representation of path labels, instead of URIs
 * This is only an approximation of the much more complicated algorithm used in the backend that
 * parses the Silk paths first.
 * This version only takes the last local name of a path.
 **/
export const getLocalNameLabelFromPath = (path: string): string => {
    if(typeof path !== "string") {
        return path
    }
    const parts = path.split(pathSplitRegex).filter(part => part !== "")
    if(parts.length > 0) {
        const localName = parts[parts.length - 1]
        return localName.replace(unAllowedChars, '')
    } else {
        return path
    }
}