import { CellDefinition } from '@/components/Field/useField.ts';
import clsx from 'clsx';
import styles from './Cell.module.scss';

type CellProps = CellDefinition;

export const Cell = ({ row, column, visible, value, merged }: CellProps) => {
    return (
        <div
            className={clsx(
                styles.container,
                !visible && styles.hidden,
                styles[`cell${value}`],
                merged && styles.merged
            )}
            style={{
                '--row': row,
                '--col': column
            }}
        >
            {value}
        </div>
    );
};
