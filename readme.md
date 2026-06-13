<!-- How to pull the code -->

go to the folder
```
git init
git clone https://github.com/Blackstocks/GenAI-ktech.git
```

<!-- to start backend -->
```
cd backend
```
<!-- if mac -->
```
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

<!-- if you have windows -->
```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```



<!-- everytime you need to update the code -->
```
git pull origin main
```