# Roadmap met opmerkingen: zelfstandige pagina's (build.py) plus server.py (site + API).
# Draait op ZAD achter de authorization-wall (SSO Rijk). Het cluster draait met een alleen-lezen
# root-bestandssysteem en een willekeurige uid; alleen /data (persistent volume) is schrijfbaar.

FROM python:3.12-slim AS bouw
WORKDIR /src
COPY build.py index.html eherkenning.html ebw.html ./
COPY logos logos
COPY vendor vendor
RUN python3 build.py

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    SITE_DIR=/app/site \
    DATA_DIR=/data
WORKDIR /app
COPY server.py .
COPY --from=bouw /src/dist site
EXPOSE 8080
USER 1001
CMD ["python3", "server.py"]
