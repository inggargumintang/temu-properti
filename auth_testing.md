# Auth Testing Playbook

## Admin Credentials
- email: `admin@speedhome.com`
- password: `Admin@12345`

## Cookie-based JWT auth
All authed requests must include `credentials: 'include'` / `withCredentials: true`.

## Curl examples
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@speedhome.com","password":"Admin@12345"}'

curl -b cookies.txt http://localhost:8001/api/auth/me
```

## Mongo
```
mongosh
use test_database
db.users.findOne({role:"admin"})
```
