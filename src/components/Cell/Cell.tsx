import styles from './Cell.module.scss';
import { CellDefinition } from '@/components/Field/useField.ts';
import clsx from 'clsx';

type CellProps = Omit<CellDefinition, 'id'>;

export const Cell = ({ row, column, visible, value }: CellProps) => {
    return (
        <div
            className={clsx(styles.container, !visible && styles.hidden, styles[`cell${value}`])}
            style={{
                '--row': row,
                '--col': column
            }}
        >
            {value}
        </div>
    );
};
