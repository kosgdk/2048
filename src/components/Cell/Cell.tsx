import { CellDefinition } from '@/components/Field/useField.ts';
import clsx from 'clsx';
import styles from './Cell.module.scss';
import { useMountEffect } from '@react-hookz/web';

type CellProps = CellDefinition;

export const Cell = ({ id, row, column, visible, value, merged }: CellProps) => {
    useMountEffect(() => {
        console.log('Cell mounted ' + id);
    });
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
