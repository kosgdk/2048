import { CellDefinition } from '@/components/Field/useField.ts';
import { useFirstMountState } from '@react-hookz/web';
import clsx from 'clsx';
import styles from './Cell.module.scss';

type CellProps = CellDefinition;

export const Cell = ({ row, column, visible, value, merged }: CellProps) => {
    const isNew = useFirstMountState();
    return (
        <div
            className={clsx(
                styles.container,
                styles[`cell${value}`],
                !visible && styles.hidden,
                merged && styles.merged,
                isNew && styles.new
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
