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
            const currentCellMap = prepareFieldForMove(cellMap);
            const field = cellMapToField(currentCellMap, fieldSize);

            switch (event.key) {
                case 'ArrowLeft': {
                    const newCellMap = onMoveLeft(field);
                    updateCellMap(newCellMap, currentCellMap, setCellMap);
                    break;
                }
                case 'ArrowRight':
                    console.log('RIGHT');
                    break;
                case 'ArrowUp':
                    console.log('UP');
                    break;
                case 'ArrowDown':
                    console.log('DOWN');
                    break;
                default:
                    break;
            }
        },
        []
    );

    console.log(Object.values(cellMap));

    return { idCellMap: cellMap, onMoveLeft };
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

const onMoveLeft = (field: Field): CellDefinitionMap => {
    const effectiveField = makeEmptyField(field.length);
    for (let row = 0; row < field.length; row++) {
        for (let column = 0; column < field.length; column++) {
            const cell = field[row][column];
            if (cell) {
                const newCell = getNewDefinitionLeft(effectiveField[row], cell);
                effectiveField[row][newCell.visibleCell.column] = newCell;
            }
        }
    }

    return fieldToCellMap(effectiveField);
};

const getNewDefinitionLeft = (effectiveFieldRow: FieldRow, cell: FieldCell): FieldCell =>
    reduceRight(
        effectiveFieldRow.slice(0, cell.visibleCell.column),
        (effectiveCell, leftCell, index) => {
            if (!leftCell) {
                return {
                    visibleCell: {
                        ...effectiveCell.visibleCell,
                        column: index
                    },
                    hiddenCells: effectiveCell.hiddenCells.map((cell) => ({ ...cell, column: index }))
                };
            } else if (!leftCell.visibleCell.merged && leftCell.visibleCell.value === cell.visibleCell.value) {
                return {
                    visibleCell: {
                        ...effectiveCell.visibleCell,
                        id: getNewId(),
                        column: index,
                        value: cell.visibleCell.value * 2,
                        merged: true
                    },
                    hiddenCells: [
                        leftCell.visibleCell,
                        {
                            ...effectiveCell.visibleCell,
                            column: index
                        }
                    ]
                };
            }
            return effectiveCell;
        },
        cloneDeep(cell)
    );

const cellMapToField = (cellMap: CellDefinitionMap, fieldSize: number): Field => {
    const field = makeEmptyField(fieldSize);
    Object.values(cellMap).forEach((cell) => {
        field[cell.row][cell.column] = { visibleCell: { ...cell, merged: false }, hiddenCells: [] };
    });
    return field;
};

const fieldToCellMap = (field: Field): CellDefinitionMap => {
    return reduce(
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
};

const makeEmptyField = (fieldSize: number): Field =>
    Array.from({ length: fieldSize }, () => Array.from({ length: fieldSize }, () => null));
