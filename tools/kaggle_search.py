import sys
from kaggle.api.kaggle_api_extended import KaggleApi

def search(q, page=1, page_size=10):
    api = KaggleApi()
    api.authenticate()
    datasets = api.dataset_list(search=q, page=page)
    for d in datasets:
        # print owner_slug/dataset-slug (ref) and title
        try:
            print(f"{d.ref}\t{d.title}")
        except Exception:
            print(d.ref)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('usage: kaggle_search.py "search terms"')
        sys.exit(1)
    q = sys.argv[1]
    search(q)
