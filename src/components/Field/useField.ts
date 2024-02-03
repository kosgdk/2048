import { useState } from 'react';
import { useKeyboardEvent } from '@react-hookz/web';
import { reduce, reduceRight } from 'lodash-es';

type CellId = string;

export type CellDefinition = {
    id: CellId;
    row: number;
    column: number;
    value: number;
    visible: boolean;
};

type FieldRow = (CellId | null)[];
type Field = FieldRow[];
type CellDefinitionMap = Record<string, CellDefinition>;

export const useField = (fieldSize: number) => {
    const [cellMap, setCellMap] = useState<CellDefinitionMap>({
        cell1: { id: 'cell1', row: 0, column: 1, value: 2, visible: true },
        cell2: { id: 'cell2', row: 0, column: 3, value: 2, visible: true }
    });

    console.log('cellMap', cellMap);

    useKeyboardEvent(
        true,
        (event) => {
            const field = cellMapToArrayField(cellMap, fieldSize);

            switch (event.key) {
                case 'ArrowLeft': {
                    const newCellMap = onMoveLeft(field, cellMap);
                    setCellMap(newCellMap);
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

    return { idCellMap: cellMap, onMoveLeft };
};

const onMoveLeft = (field: Field, idCellMap: CellDefinitionMap): CellDefinitionMap => {
    console.log('field', field);
    const effectiveField = makeEmptyField(field.length);
    for (let row = 0; row < field.length; row++) {
        for (let column = 0; column < field.length; column++) {
            const cellId = field[row][column];
            if (cellId) {
                const cell = idCellMap[cellId];
                const newColumn = findNewLeftPosition(effectiveField[row], cell);
                effectiveField[row][newColumn] = cellId;
            }
        }
    }

    console.log('effectiveField', effectiveField);

    return fieldToCellMap(effectiveField, idCellMap);
};

const findNewLeftPosition = (effectiveFieldRow: FieldRow, cell: CellDefinition): number =>
    reduceRight(
        effectiveFieldRow.slice(0, cell.column),
        (newColumn, currentCell, index) => (currentCell === null ? index : newColumn),
        cell.column
    );

const cellMapToArrayField = (idCellMap: CellDefinitionMap, fieldSize: number): Field => {
    const field = makeEmptyField(fieldSize);
    Object.values(idCellMap).forEach((cell) => {
        field[cell.row][cell.column] = cell.id;
    });
    return field;
};

const fieldToCellMap = (field: Field, idCellMap: CellDefinitionMap): CellDefinitionMap => {
    return reduce(
        field,
        (result: CellDefinitionMap, row: FieldRow, rowIndex: number) => {
            const rowCells = reduce(
                row,
                (rowResult: CellDefinitionMap, cellId: CellId | null, columnIndex: number) => {
                    if (cellId) {
                        rowResult[cellId] = { ...idCellMap[cellId], row: rowIndex, column: columnIndex };
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
