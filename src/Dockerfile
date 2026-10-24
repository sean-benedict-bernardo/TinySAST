# Use the Python 3.10 slim image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# setup venv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code and .env file into the container
COPY main.py sqlite_manager.py logger.py .env ./

# Copy frontend dist folder into the container
COPY dist/ ./dist/

# Run the Python script with unbuffered output
CMD ["python", "-u", "main.py"]