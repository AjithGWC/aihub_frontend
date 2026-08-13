# AI Dashboard Studio — frontend (Vite dev server + SSH).
FROM node:20-alpine

# RUN apk add --no-cache openssh-server openssh-client

# # Create SSH user (use 1001 to avoid conflict with node user)
# RUN addgroup -g 1001 frontend && \
#     adduser -D -u 1001 -G frontend -h /home/frontend frontend && \
#     echo "frontend:frontend" | chpasswd && \
#     mkdir -p /home/frontend/.ssh && \
#     chmod 700 /home/frontend/.ssh

# # Setup SSH host keys
# RUN mkdir -p /etc/ssh && \
#     ssh-keygen -A

# # Create SSH config
# RUN mkdir -p /run/sshd

WORKDIR /workspace/frontend

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 8080 22
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:8080 || exit 1

# Start npm dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]