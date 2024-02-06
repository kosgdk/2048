import styles from './Field.module.scss';
import { useField } from '@/components/Field/useField.ts';
import { Cell } from '@/components/Cell/Cell.tsx';
import clsx from 'clsx';
import { noop } from 'lodash';

declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number;
    }
}

export const CELLS_PER_ROW = 4;
const ANIMATION_DURATION_MS = 200;

export const Field = () => {
    const { idCellMap, isGameOver, onNewGame, swipeHandlers } = useField(CELLS_PER_ROW, ANIMATION_DURATION_MS);

    return (
        <div
            className={styles.container}
            onClick={isGameOver ? onNewGame : noop}
            {...swipeHandlers}
        >
            <div
                className={clsx(styles.field, isGameOver && styles.fieldGameOver)}
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

                {isGameOver && (
                    <div className={styles.gameOver}>
                        <div className={styles.gameOverHeader}>Game Over</div>
                        <div className={styles.gameOverDescription}>
                            Click here or press any key to start a new game
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
