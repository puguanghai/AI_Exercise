FROM python:3.10-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt ./
RUN apt update && apt install -y ffmpeg libgl1 && \
    pip install --upgrade pip && \
    pip install -r requirements.txt

# 拷贝代码
COPY . .

# 启动命令：你也可以换成 gunicorn 等
CMD ["python", "app.py"]
