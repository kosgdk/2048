import { Dispatch, SetStateAction, useState } from 'react';
import { useKeyboardEvent } from '@react-hookz/web';
import { chain, cloneDeep, keys, reduce, reduceRight } from 'lodash-es';

type CellId = number;

export type CellDefinition = {
    id: CellId;
    row: number;
    column: number;
    value: number;
    visible: boolean;
    merged: boolean;
};

type FieldCell = {
    visibleCell: FieldCellDefinition;
    hiddenCells: FieldCellDefinition[];
};

type FieldCellDefinition = CellDefinition & {
    merged: boolean;
};

type FieldRow = (FieldCell | null)[];
type Field = FieldRow[];
type CellDefinitionMap = Record<string, CellDefinition>;

const KEY_LEFT = 'ArrowLeft';
const KEY_RIGHT = 'ArrowRight';
const KEY_UP = 'ArrowUp';
const KEY_DOWN = 'ArrowDown';

const arrowKeysSet = new Set([KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN]);

//todo: move inside hook?
let id = 17;
const getNewId = () => id++;

// todo: block moves until animation is finished
export const useField = (fieldSize: number) => {
    const [cellMap, setCellMap] = useState<CellDefinitionMap>({
        1: { id: 1, row: 0, column: 0, value: 2, visible: true, merged: false },
        2: { id: 2, row: 0, column: 1, value: 2, visible: true, merged: false },
        3: { id: 3, row: 0, column: 2, value: 2, visible: true, merged: false },
        4: { id: 4, row: 0, column: 3, value: 2, visible: true, merged: false },
        5: { id: 5, row: 1, column: 0, value: 2, visible: true, merged: false },
        6: { id: 6, row: 1, column: 1, value: 2, visible: true, merged: false },
        7: { id: 7, row: 1, column: 2, value: 2, visible: true, merged: false },
        8: { id: 8, row: 1, column: 3, value: 2, visible: true, merged: false },
        9: { id: 9, row: 2, column: 0, value: 2, visible: true, merged: false },
        10: { id: 10, row: 2, column: 1, value: 2, visible: true, merged: false },
        11: { id: 11, row: 2, column: 2, value: 2, visible: true, merged: false },
        12: { id: 12, row: 2, column: 3, value: 2, visible: true, merged: false },
        13: { id: 13, row: 3, column: 0, value: 2, visible: true, merged: false },
        14: { id: 14, row: 3, column: 1, value: 2, visible: true, merged: false },
        15: { id: 15, row: 3, column: 2, value: 2, visible: true, merged: false },
        16: { id: 16, row: 3, column: 3, value: 2, visible: true, merged: false }
    });

    useKeyboardEvent(
        true,
        (event) => {
            if (!arrowKeysSet.has(event.key)) {
                return;
            }

            const currentCellMap = prepareFieldForMove(cellMap);
            const field = cellMapToField(currentCellMap, fieldSize);

            let newCellMap: CellDefinitionMap;
            switch (event.key) {
                case KEY_LEFT:
                    newCellMap = onMoveHorizontal(field, false);
                    break;
                case KEY_RIGHT:
                    newCellMap = onMoveHorizontal(field, true);
                    break;
                case KEY_UP:
                    newCellMap = onMoveVertical(field, false);
                    break;
                case KEY_DOWN:
                    newCellMap = onMoveVertical(field, true);
                    break;
                default:
                    return;
            }
            updateCellMap(newCellMap, currentCellMap, setCellMap);
        },
        []
    );

    return { idCellMap: cellMap, onMoveLeft: onMoveHorizontal };
};

const updateCellMap = (
    newCellMap: CellDefinitionMap,
    prevCellMap: CellDefinitionMap,
    updateFn: Dispatch<SetStateAction<CellDefinitionMap>>
) => {
    const hiddenCells: CellDefinitionMap = chain(prevCellMap)
        .keys()
        .difference(keys(newCellMap))
        .map((id) => {
            const cell: CellDefinition = {
                ...prevCellMap[id],
                visible: false
            };
            return cell;
        })
        .keyBy((cell) => cell.id)
        .value();

    updateFn({
        ...newCellMap,
        ...hiddenCells
    });
};

const prepareFieldForMove = (cellMap: CellDefinitionMap): CellDefinitionMap =>
    chain(cellMap)
        .filter((cell) => cell.visible)
        .map((cell) => ({ ...cell, merged: false }))
        .keyBy((cell) => cell.id)
        .value();

const onMoveHorizontal = (field: Field, isForward: boolean): CellDefinitionMap => {
    const effectiveField = field.reduce((resultField, row, rowIndex) => {
        const reduceFn = isForward ? reduceRight : reduce;
        const reducedRow = reduceFn(
            row,
            (resultRow, cell) => {
                if (cell) {
                    const newCell = getNewDefinition(resultRow, cell, true, isForward);
                    resultRow[newCell.visibleCell.column] = newCell;
                }
                return resultRow;
            },
            makeEmptyFieldRow(field.length)
        );
        resultField[rowIndex] = reducedRow;
        rowIndex === 0 && console.log(reducedRow);
        return resultField;
    }, makeEmptyField(field.length));
    return fieldToCellMap(effectiveField);
};

// todo: rewrite in functional way
const onMoveVertical = (field: Field, isForward: boolean): CellDefinitionMap => {
    const effectiveField = makeEmptyField(field.length);
    for (let column = 0; column < field.length; column++) {
        if (isForward) {
            for (let row = field.length - 1; row >= 0; row--) {
                const cell = field[row][column];
                if (cell) {
                    const newCell = getNewDefinition(
                        effectiveField.map((row) => row[column]),
                        cell,
                        false,
                        isForward
                    );
                    effectiveField[newCell.visibleCell.row][column] = newCell;
                }
            }
        } else {
            for (let row = 0; row < field.length; row++) {
                const cell = field[row][column];
                if (cell) {
                    const newCell = getNewDefinition(
                        effectiveField.map((row) => row[column]),
                        cell,
                        false,
                        isForward
                    );
                    effectiveField[newCell.visibleCell.row][column] = newCell;
                }
            }
        }
    }
    return fieldToCellMap(effectiveField);
};

const getNewDefinition = (
    effectiveFieldRow: FieldRow,
    cell: FieldCell,
    isHorizontal: boolean,
    isForward: boolean
): FieldCell => {
    const reduceFn = isForward ? reduce : reduceRight;
    const indexFieldName = isHorizontal ? 'column' : 'row';
    const effectiveRowSegment = isForward
        ? effectiveFieldRow.slice(cell.visibleCell[indexFieldName] + 1)
        : effectiveFieldRow.slice(0, cell.visibleCell[indexFieldName]);
    return reduceFn(
        effectiveRowSegment,
        (effectiveCell, nextCell, index) => {
            const nextCellIndex = isForward ? effectiveFieldRow.length - (effectiveRowSegment.length - index) : index;
            console.log(
                'getNewDefinition',
                effectiveCell,
                nextCell,
                nextCellIndex,
                effectiveFieldRow,
                effectiveRowSegment
            );
            if (!nextCell) {
                return {
                    visibleCell: {
                        ...effectiveCell.visibleCell,
                        [indexFieldName]: nextCellIndex
                    },
                    hiddenCells: effectiveCell.hiddenCells.map((cell) => ({ ...cell, [indexFieldName]: nextCellIndex }))
                };
            } else if (!nextCell.visibleCell.merged && nextCell.visibleCell.value === effectiveCell.visibleCell.value) {
                return {
                    visibleCell: {
                        ...effectiveCell.visibleCell,
                        id: getNewId(),
                        [indexFieldName]: nextCellIndex,
                        value: effectiveCell.visibleCell.value * 2,
                        merged: true
                    },
                    hiddenCells: [
                        nextCell.visibleCell,
                        {
                            ...effectiveCell.visibleCell,
                            [indexFieldName]: nextCellIndex
                        }
                    ]
                };
            }
            return effectiveCell;
        },
        cloneDeep(cell)
    );
};

const cellMapToField = (cellMap: CellDefinitionMap, fieldSize: number): Field => {
    const field = makeEmptyField(fieldSize);
    Object.values(cellMap).forEach((cell) => {
        field[cell.row][cell.column] = { visibleCell: { ...cell, merged: false }, hiddenCells: [] };
    });
    return field;
};

const fieldToCellMap = (field: Field): CellDefinitionMap => {
    const result = reduce(
        field,
        (result: CellDefinitionMap, row: FieldRow) => {
            const rowCells = reduce(
                row,
                (rowResult: CellDefinitionMap, fieldCell: FieldCell | null) => {
                    if (fieldCell) {
                        rowResult[fieldCell.visibleCell.id] = fieldCell.visibleCell;
                        fieldCell.hiddenCells.forEach((cell) => {
                            rowResult[cell.id] = { ...cell, visible: false };
                        });
                    }
                    return rowResult;
                },
                {}
            );
            return { ...result, ...rowCells };
        },
        {}
    );
    console.log('fieldToCellMap', field, result);
    return result;
};

const makeEmptyField = (fieldSize: number): Field =>
    Array.from({ length: fieldSize }, () => makeEmptyFieldRow(fieldSize));

const makeEmptyFieldRow = (fieldSize: number): FieldRow => Array.from({ length: fieldSize }, () => null);
