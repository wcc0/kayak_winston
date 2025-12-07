import pandas as pd
import os

data_root = os.path.join(os.getcwd(), 'data', 'raw')
print('Kaggle datasets in', data_root)

for d in os.listdir(data_root):
    path = os.path.join(data_root, d)
    if not os.path.isdir(path):
        continue
    print(f'\n{d}:')
    for f in os.listdir(path):
        if f.endswith('.csv'):
            csv_path = os.path.join(path, f)
            try:
                df = pd.read_csv(csv_path, nrows=1)
                row_count = sum(1 for _ in pd.read_csv(csv_path, usecols=[0]).iterrows())
                print(f'  {f}: {row_count} rows, columns: {list(df.columns)[:5]}')
            except Exception as e:
                print(f'  {f}: error - {e}')
