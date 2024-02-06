import { useMemo, useState } from 'react';
import { useCounter, useKeyboardEvent } from '@react-hookz/web';
import { chain, cloneDeep, isEqual, keys, reduce, reduceRight } from 'lodash';

type CellId = string;

type CellCoordinates = {
    row: number;
    column: number;
};

export type CellDefinition = {
    id: CellId;
    value: number;
    visible: boolean;
    merged: boolean;
} & CellCoordinates;

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
const getNewId = () => crypto.randomUUID();

export const useField = (fieldSize: number, animationDurationMs: number) => {
    const [moveInProgress, setMoveInProgress] = useState(false);
    const [moveNumber, { inc: incrementMoveNumber, reset: resetMoveNumber }] = useCounter(0);
    const [cellMapHistory, setCellMapHistory] = useState<CellDefinitionMap[]>([makeInitialCellMap(fieldSize)]);

    const cellMap = cellMapHistory[moveNumber];
    const setCellMap = (newCellMap: CellDefinitionMap) => {
        setCellMapHistory((prevCellMapHistory) => [...prevCellMapHistory.slice(0, moveNumber + 1), newCellMap]);
        incrementMoveNumber();
    };

    const isGameOver = useMemo(() => !canMakeEffectiveMove(cellMap, fieldSize), [cellMap, fieldSize]);

    useKeyboardEvent(
        true,
        (event) => {
            if (isGameOver) {
                onNewGame();
            }

            if (event.ctrlKey && event.code === 'KeyZ' && canUndo) {
                onUndo();
            }

            if (!arrowKeysSet.has(event.code) || moveInProgress || isGameOver) {
                return;
            }

            setMoveInProgress(true);

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

            setTimeout(() => {
                setMoveInProgress(false);
            }, animationDurationMs);

            if (!haveEffectiveChanges(newCellMap, currentCellMap)) {
                return;
            }

            const newCell = makeNewCell(newCellMap, fieldSize);
            const effectiveNewCellMap = { ...newCellMap, [newCell.id]: newCell };
            updateCellMap(effectiveNewCellMap, currentCellMap, setCellMap);
        },
        []
    );

    const onUndo = () => {
        incrementMoveNumber(-1);
    };

    const onNewGame = () => {
        setCellMapHistory([makeInitialCellMap(fieldSize)]);
        resetMoveNumber();
    };

    const canUndo = moveNumber > 0;

    return { idCellMap: cellMap, isGameOver };
};

const haveEffectiveChanges = (newCellMap: CellDefinitionMap, prevCellMap: CellDefinitionMap): boolean => {
    const newVisibleCells = new Set(getVisibleCells(newCellMap));
    const prevVisibleCells = new Set(getVisibleCells(prevCellMap));
    return !isEqual(newVisibleCells, prevVisibleCells);
};

const getVisibleCells = (cellMap: CellDefinitionMap): CellDefinition[] =>
    Object.values(cellMap).filter((cell) => cell.visible);

const updateCellMap = (
    newCellMap: CellDefinitionMap,
    prevCellMap: CellDefinitionMap,
    updateFn: (newCellMap: CellDefinitionMap) => void
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
        resultField[rowIndex] = reduceFn(
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
        return resultField;
    }, makeEmptyField(field.length));
    return fieldToCellMap(effectiveField);
};

const onMoveVertical = (field: Field, isForward: boolean): CellDefinitionMap => {
    const effectiveField = makeEmptyField(field.length);

    const processCell = (row: number, column: number) => {
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
    };

    for (let column = 0; column < field.length; column++) {
        if (isForward) {
            for (let row = field.length - 1; row >= 0; row--) {
                processCell(row, column);
            }
        } else {
            for (let row = 0; row < field.length; row++) {
                processCell(row, column);
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
    const indexFieldName = isHorizontal ? 'column' : 'row';

    const effectiveRowSegment = isForward
        ? effectiveFieldRow.slice(cell.visibleCell[indexFieldName] + 1)
        : effectiveFieldRow.slice(0, cell.visibleCell[indexFieldName]);

    let effectiveCell = cloneDeep(cell);

    const calculateDefinition = (
        currentCell: FieldCell,
        nextCell: FieldCell | null,
        nextCellIndex: number
    ): FieldCell | null => {
        if (!nextCell) {
            return {
                visibleCell: {
                    ...currentCell.visibleCell,
                    [indexFieldName]: nextCellIndex
                },
                hiddenCells: currentCell.hiddenCells.map((cell) => ({ ...cell, [indexFieldName]: nextCellIndex }))
            };
        } else if (
            !nextCell.visibleCell.merged &&
            !currentCell.visibleCell.merged &&
            nextCell.visibleCell.value === currentCell.visibleCell.value
        ) {
            return {
                visibleCell: {
                    ...currentCell.visibleCell,
                    id: getNewId(),
                    [indexFieldName]: nextCellIndex,
                    value: currentCell.visibleCell.value * 2,
                    merged: true
                },
                hiddenCells: [
                    nextCell.visibleCell,
                    {
                        ...currentCell.visibleCell,
                        [indexFieldName]: nextCellIndex
                    }
                ]
            };
        } else {
            return null;
        }
    };

    if (isForward) {
        for (
            let nextCellIndex = effectiveCell.visibleCell[indexFieldName] + 1;
            nextCellIndex <= cell.visibleCell[indexFieldName] + effectiveRowSegment.length;
            nextCellIndex++
        ) {
            const nextCell = effectiveRowSegment[nextCellIndex - cell.visibleCell[indexFieldName] - 1];
            const newCell = calculateDefinition(effectiveCell, nextCell, nextCellIndex);
            if (newCell) {
                effectiveCell = newCell;
            } else {
                break;
            }
        }
    } else {
        for (let nextCellIndex = effectiveCell.visibleCell[indexFieldName] - 1; nextCellIndex >= 0; nextCellIndex--) {
            const nextCell = effectiveRowSegment[nextCellIndex];
            const newCell = calculateDefinition(effectiveCell, nextCell, nextCellIndex);
            if (newCell) {
                effectiveCell = newCell;
            } else {
                break;
            }
        }
    }

    return effectiveCell;
};

const canMakeEffectiveMove = (cellMap: CellDefinitionMap, fieldSize: number): boolean => {
    const field = cellMapToField(cellMap, fieldSize);

    for (let row = 0; row < fieldSize; row++) {
        for (let column = 0; column < fieldSize; column++) {
            const cell = field[row][column];
            if (!cell?.visibleCell) {
                return true;
            }

            const rightCell = field[row][column + 1];
            if (
                (!rightCell?.visibleCell && column < fieldSize - 1) ||
                cell.visibleCell.value === rightCell?.visibleCell?.value
            ) {
                return true;
            }

            if (row === fieldSize - 1) {
                continue;
            }

            const bottomCell = field[row + 1][column];
            if (!bottomCell?.visibleCell || cell.visibleCell.value === bottomCell.visibleCell.value) {
                return true;
            }
        }
    }

    return false;
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
    return result;
};

const makeEmptyField = (fieldSize: number): Field =>
    Array.from({ length: fieldSize }, () => makeEmptyFieldRow(fieldSize));

const makeEmptyFieldRow = (fieldSize: number): FieldRow => Array.from({ length: fieldSize }, () => null);

const getEmptyCoordinates = (cellMap: CellDefinitionMap, fieldSize: number): CellCoordinates[] =>
    cellMapToField(cellMap, fieldSize).reduce((acc, row, rowIndex) => {
        const emptyCellsInRow = row
            .map((cell, columnIndex) => (cell ? null : { row: rowIndex, column: columnIndex }))
            .filter(Boolean) as CellCoordinates[];
        return [...acc, ...emptyCellsInRow];
    }, [] as CellCoordinates[]);

const makeNewCell = (cellMap: CellDefinitionMap, fieldSize: number): CellDefinition => {
    const emptyCoordinates = getEmptyCoordinates(cellMap, fieldSize);
    const cellCoordinates = getRandomElement(emptyCoordinates);
    return {
        id: getNewId(),
        value: getNewCellValue(),
        visible: true,
        merged: false,
        ...cellCoordinates
    };
};

const getRandomElement = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];

const getNewCellValue = () => (Math.random() < 0.9 ? 2 : 4);

const makeInitialCellMap = (fieldSize: number): CellDefinitionMap =>
    Array.from({ length: 2 }).reduce((cellMap: CellDefinitionMap) => {
        const cell = makeNewCell(cellMap, fieldSize);
        return { ...cellMap, [cell.id]: cell };
    }, {} as CellDefinitionMap);
