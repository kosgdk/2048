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
let id = 5;
const getNewId = () => id++;

// todo: block moves until animation is finished
export const useField = (fieldSize: number) => {
    const [cellMap, setCellMap] = useState<CellDefinitionMap>({
        1: { id: 1, row: 0, column: 0, value: 2, visible: true, merged: false },
        2: { id: 2, row: 0, column: 1, value: 2, visible: true, merged: false },
        3: { id: 3, row: 0, column: 2, value: 2, visible: true, merged: false },
        4: { id: 4, row: 0, column: 3, value: 2, visible: true, merged: false }
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
                    newCellMap = onMoveHorizontalLeft(field, false);
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

// const onMoveHorizontal = (field: Field, isForward: boolean): CellDefinitionMap => {
//     const effectiveField = makeEmptyField(field.length);
//     for (let row = 0; row < field.length; row++) {
//         for (let column = 0; column < field.length; column++) {
//             const cell = field[row][column];
//             if (cell) {
//                 const newCell = getNewDefinition(effectiveField[row], cell, isForward);
//                 effectiveField[row][newCell.visibleCell.column] = newCell;
//             }
//         }
//     }
//     return fieldToCellMap(effectiveField);
// };

const onMoveHorizontalLeft = (field: Field, isForward: boolean): CellDefinitionMap => {
    const effectiveField = field.reduce((resultField, row, rowIndex) => {
        const reduceFn = reduce;
        const reducedRow = reduceFn(
            row,
            (resultRow, cell) => {
                if (cell) {
                    const newCell = getNewDefinitionLeft(resultRow, cell, isForward);
                    resultRow[newCell.visibleCell.column] = newCell;
                }
                return resultRow;
            },
            makeEmptyFieldRow(field.length)
        );
        resultField[rowIndex] = reducedRow;
        return resultField;
    }, makeEmptyField(field.length));
    return fieldToCellMap(effectiveField);
};

const onMoveHorizontal = (field: Field, isForward: boolean): CellDefinitionMap => {
    const effectiveField = field.reduce((resultField, row, rowIndex) => {
        const reduceFn = reduceRight;
        const reducedRow = reduceFn(
            row,
            (resultRow, cell) => {
                if (cell) {
                    const newCell = getNewDefinition(resultRow, cell, isForward);
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

const onMoveVertical = (field: Field, isForward: boolean): CellDefinitionMap => {
    const effectiveField = makeEmptyField(field.length);
    for (let column = 0; column < field.length; column++) {
        for (let row = 0; row < field.length; row++) {
            const cell = field[row][column];
            if (cell) {
                const newCell = getNewDefinition(
                    effectiveField.map((row) => row[column]),
                    cell,
                    isForward
                );
                effectiveField[newCell.visibleCell.row][column] = newCell;
            }
        }
    }
    return fieldToCellMap(effectiveField);
};

const getNewDefinition = (effectiveFieldRow: FieldRow, cell: FieldCell, isForward: boolean): FieldCell => {
    const reduceFn = reduce;
    const effectiveRowSegment = effectiveFieldRow.slice(cell.visibleCell.column + 1);
    return reduceFn(
        effectiveRowSegment,
        (effectiveCell, nextCell, index) => {
            const nextCellIndex = effectiveFieldRow.length - (effectiveRowSegment.length - index);
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
                        column: nextCellIndex
                    },
                    hiddenCells: effectiveCell.hiddenCells.map((cell) => ({ ...cell, column: nextCellIndex }))
                };
            } else if (!nextCell.visibleCell.merged && nextCell.visibleCell.value === effectiveCell.visibleCell.value) {
                return {
                    visibleCell: {
                        ...effectiveCell.visibleCell,
                        id: getNewId(),
                        column: nextCellIndex,
                        value: effectiveCell.visibleCell.value * 2,
                        merged: true
                    },
                    hiddenCells: [
                        nextCell.visibleCell,
                        {
                            ...effectiveCell.visibleCell,
                            column: nextCellIndex
                        }
                    ]
                };
            }
            return effectiveCell;
        },
        cloneDeep(cell)
    );
};

const getNewDefinitionLeft = (effectiveFieldRow: FieldRow, cell: FieldCell, isForward: boolean): FieldCell => {
    const reduceFn = reduceRight;
    const effectiveRowSegment = effectiveFieldRow.slice(0, cell.visibleCell.column);
    return reduceFn(
        effectiveRowSegment,
        (effectiveCell, nextCell, index) => {
            const nextCellIndex = index;
            if (!nextCell) {
                return {
                    visibleCell: {
                        ...effectiveCell.visibleCell,
                        column: nextCellIndex
                    },
                    hiddenCells: effectiveCell.hiddenCells.map((cell) => ({ ...cell, column: nextCellIndex }))
                };
            } else if (!nextCell.visibleCell.merged && nextCell.visibleCell.value === effectiveCell.visibleCell.value) {
                return {
                    visibleCell: {
                        ...effectiveCell.visibleCell,
                        id: getNewId(),
                        column: nextCellIndex,
                        value: effectiveCell.visibleCell.value * 2,
                        merged: true
                    },
                    hiddenCells: [
                        nextCell.visibleCell,
                        {
                            ...effectiveCell.visibleCell,
                            column: nextCellIndex
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
