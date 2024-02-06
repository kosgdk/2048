import styles from './Field.module.scss';
import { useField } from '@/components/Field/useField.ts';
import { Cell } from '@/components/Cell/Cell.tsx';

declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number;
    }
}

export const CELLS_PER_ROW = 4;
const ANIMATION_DURATION_MS = 200;

export const Field = () => {
    const { idCellMap, onUndo, canUndo } = useField(CELLS_PER_ROW, ANIMATION_DURATION_MS);
    return (
        <div>
            <div
                className={styles.field}
                style={{
                    '--cells-per-row': CELLS_PER_ROW,
                    '--animation-duration': `${ANIMATION_DURATION_MS}ms`
                }}
            >
                {Array.from({ length: CELLS_PER_ROW ** 2 }).map((_, index) => (
                    <div
                        key={index}
                        className={styles.emptyCell}
                    />
                ))}

                {Object.keys(idCellMap)
                    .sort()
                    .map((id) => {
                        const cell = idCellMap[id];
                        return (
                            <Cell
                                key={id}
                                {...cell}
                            />
                        );
                    })}
            </div>
            <div>
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                >
                    Undo
                </button>
            </div>
        </div>
    );
};
