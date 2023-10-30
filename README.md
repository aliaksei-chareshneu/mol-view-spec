MolViewSpec
=============

## MolViewSpec Python Library
Colab Notebook: https://colab.research.google.com/drive/1O2TldXlS01s-YgkD9gy87vWsfCBTYuz9

### Setting up the environment

```
mamba env create -f ./environment.yaml
conda activate mol-view-spec-dev
```

### Running the server

```
cd molviewspec
python serve.py # or make serve
```

will run the server on `localhost:9000` with reload mode on.

- API Docs: `http://localhost:9000/docs`
- Example: `http://localhost:9000/api/v1/examples/load/1tqn`