.PHONY: test contracts eval

test:
	.venv/Scripts/python.exe -m pytest -q

contracts:
	.venv/Scripts/python.exe -m compileall -q contracts analysis backend

eval:
	.venv/Scripts/python.exe -m pytest tests/integration -q
