from kaggle.api.kaggle_api_extended import KaggleApi
import os

DATA_ROOT = os.path.abspath(os.path.join(os.getcwd(), 'data', 'raw'))

# Candidate dataset refs to download (owner/slug)
DATASETS = [
    'dominoweir/inside-airbnb-nyc',
    'konradb/inside-airbnb-usa',
    'jessemostipak/hotel-booking-demand',
    'dilwong/flightprices',
    'open-flights/flight-route-database',
    'moonnectar/airline-routes-92k-and-airports-10k-dataset',
    'ahmadrafiee/airports-airlines-planes-and-routes-update-2024'
]


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def download_dataset(ref: str):
    api = KaggleApi()
    api.authenticate()
    slug = ref.replace('/', '_')
    out_dir = os.path.join(DATA_ROOT, slug)
    ensure_dir(out_dir)
    print(f'Downloading {ref} -> {out_dir}')
    try:
        api.dataset_download_files(ref, path=out_dir, unzip=True, force=False)
        print('Done', ref)
    except Exception as e:
        print('Failed', ref, e)


def main():
    ensure_dir(DATA_ROOT)
    for d in DATASETS:
        download_dataset(d)


if __name__ == '__main__':
    main()
