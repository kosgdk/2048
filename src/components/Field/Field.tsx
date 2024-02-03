import styles from './Field.module.scss';
import { useField } from '@/components/Field/useField.ts';
import { Cell } from '@/components/Cell/Cell.tsx';
import { omit } from 'lodash-es';

declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number;
    }
}

export const CELLS_PER_ROW = 4;

export const Field = () => {
    const { idCellMap, onMoveLeft } = useField(CELLS_PER_ROW);
    return (
        <div
            className={styles.container}
            style={{
                '--cells-per-row': CELLS_PER_ROW
            }}
        >
            {Array.from({ length: CELLS_PER_ROW ** 2 }).map((_, index) => (
                <div
                    key={index}
                    className={styles.emptyCell}
                />
            ))}

            {Object.values(idCellMap).map((cell) => (
                <Cell
                    key={cell.id}
                    {...omit(cell, 'id')}
                />
            ))}
        </div>
    );
};
