docker run \
    --name miaoma-pgvector \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=heyi \
    -e POSTGRES_DB=embedding \
    -p 5432:5432 \
    -d \
    pgvector/pgvector:pg16