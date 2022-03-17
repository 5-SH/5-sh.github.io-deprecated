---
layout: post
title: Kubernetes for appliation developers - 2. 빌드
date: 2022-03-17 18:10:00 + 0900
categories: Kubernetes
ref: kubernetes, container, docker
---

# Kubernetes for application developers(LFD459)

## 2. 빌드

### 2-1. 컨테이너 옵션

#### 2-1-1. 도커
  - 도커는 서버를 구동하기 위한 환경을 이미지 형태로 구성해 컨테이너에 설치해 준다.   
  도커를 사용하면 한 컴퓨터에 다양한 환경을 구축할 수 있다.
  
  - 가상화와 다른 점은 가상화는 새로운 PC 를 구축하는 것과 같아 OS 기능이 중복되어 설치되고   
  PC 자원을 정해진 만큼만 할당 받아 사용할 수 있다.   
  
  - 하지만 도커로 구성하면 PC 자원을 필요한 만큼 동적으로 요청해 사용할 수 있고 OS 위에 프로세스 처럼   
  올라가는 형식이라 가상화에 비해 가볍고 성능이 좋다.
  
  - 쿠버네티스에서 도커는 컨테이너화 되어 동작하는 애플리케이션과 같은 의미로 쓰이며,    
  컨테이너를 동작하는데 도커 엔진을 기본으로 사용하고 있다.
  
  - https://hub.docker.com 에서 필요한 이미지를 다운 받아 사용할 수 있다.

#### 2-1-2. Container Runtime Interface (CRI)
  - 컨테이너 런타임 인터페이스(CRI)는 클러스터 컴포넌트를 다시 컴파일하지 않아도 Kubelet이 다양한 컨테이너 런타임을 사용할 수 있도록 하는 플러그인 인터페이스다.

  - Kubelet은 gRPC 프레임워크를 사용하여 Unix 소켓을 통해 컨테이너 런타임과 통신한다. 

  - 주로 cri-o, rklet, frakti 를 사용한다.

### 2-2. 애플리케이션 컨테이너화 하기
  - 애플리케이션을 컨테이너로 만들기 위해 stateless 하고 결합도가 낮은 투명한 애플리케이션을 만든다.

  - ConfigMaps, 와 Secret 을 애플리케이션의 환경 변수 대신으로 사용할 수 있다.   
  애플리케이션을 직접 수정할 필요 없이 ConfigMaps, Secret 을 사용해 다양한 환경에 배포할 수 있다.
  
  - 도커를 사용해 컨테이너로 만드는 것이 보편적이며 buildah 나 podman 을 사용해 컨테이너를 만들 수 있다.

### 2-3. 도커파일 만들기

### 2-4. 로컬 레포지토리

### 2-5. Deployment 만들기
  - Deployment 는 애플리케이션 단위를 관리하는 컨트롤러 이며, Pod 에 대한 스펙을 정의한 오브젝트 이다.

  - Pod 의 스케일 인/아웃을 정의하고 Pod 의 배포, 업데이트 버전을 추적할 수 있다. 그리고 Pod 에 대한 롤백을 수행한다.

  - Deployment = ReplicaSet + Pod + history

  - ReplicaSet 은 라벨 선택자를 통해 노드 상의 여러 Pod 의 생성/복제/삭제 등 라이프 사이클을 관리한다.

  - Deployment 를 정의한 yaml 파일을 작성하거나 명령어 실행으로 만들 수 있다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-nginx-deployment
spec:
  selector:
    matchLabels:
      run: my-nginx
  replicas: 2
  template:
    metadata:
      labels:
        run: my-nginx
    spec:
      containers:
      - name: my-nginx-container
        image: nginx
        imagePullPolicy: Always
        ports:
        - containerPort: 80

또는

kubectl create deployment time-date --image=<repo>/<app-name>:<version>
```

### 2.6. 컨테이너에서 명령 실행하기
  - kubectl exec -it <Pod-Name> -- /bin/bash 명령어로  Pod 에 접속해 명령어를 실행할 수 있다.
  
  - 이미지가 만들어진 환경에 따라 실행할 수 있는 명령어가 다를 수 있다.


### 2-7. Multi-Container Pod
  - 하나의 Pod 에 하나의 애플리케이션이 올라가는 것을 권장한다. 애플리케이션은 하나가 올라가지만 애플리케이션에 필요한 컨테이너는 여러 개가 될 수 있기 때문에 하나의 Pod 에 여러 컨테이너가 올라갈 수 있다.

  - Pod 내 각각의 컨테이너는 투명하고 결합도가 낮아야 한다. 결합도가 높거나 투명하지 않다면 확장성이 낮아 컨테이너가 변경될 때 마다 Pod 를 매번 빌드해야 할 수 있다.

  - Pod 내 컨테이너들은 하나의 고유한 IP 와 네임스페이스를 공유한다. 그리고 Pod 의 스토리지에 대한 동일한 접근 권한을 가진다.

  - ambassador : 이 타입의 추가 컨테이너는 외부의 리소스와 통신하는데 사용한다. 

  - adaptor : 이 타입의 추가 컨테이너는 주요 애플리케이션 컨테이너가 만든 데이터를 수정한다. 예를 들어 다른 곳에서 사용할 수 없는 ASCII 형식으로 데이터가 만들어 지면, 다른 형식의 데이터로 수정하는 역할을 한다.

  - sidecar : 로깅, 보안 등 주요 애플리케이션 컨테이너를 보조하는 역할을 한다.

### 2-8. readinessProbe
  - 컨테이너가 서비스가 가능한 상태인지 확인하는 방법이다. Command, HTTP, TCP probe 세 가지 방법을 제공한다.

  - HTTP probe : HTTP GET 을 사용해 컨테이너 상태를 확인한다. 200~300 사이 응답코드를 받으면 서비스가 가능한 상태로 판단하고 그 외의 경우 비정상 상태로 판단한다.

```yaml
metadata:
  name: readiness-rc
spec:
  replicas: 2
  selector:
    app: readiness
  template:
    metadata:
      name: readiness-pod
      labels:
        app: readiness
    spec:
      containers:
      - name: readiness
        image: k8s.gcr.io/goproxy:0.1
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /readiness
```

  - Command probe : 쉘 명령을 사용해 컨테이너 상태를 확인한다. 결과가 0 이면 서비스 가능한 상태로 판단하고 그 외의 경우 비정상 상태로 판단한다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: liveness-pod
spec:
  containers:
  - name: liveness
    image: k8s.gcr.io/goproxy:0.1
    imagePullPolicy: Always
    ports:
    - containerPort: 8080
    livenessProbe:
      exec:
        command:
        - cat
        - /tmp/healthy
```

### 2-9. livenessProbe
  - 컨테이너 상태를 주기적으로 확인해 응답이 없으면 kubelet 을 통해 컨테이너를 자동으로 재시작해 준다.

  - initialDelaySecond 설정된 값 만큼 대기를 했다가 periodSecond 에 정해진 주기로 컨테이너의 상태를 확인한다. 

  - 상태 확인 방법으로 Command, HTTP, TCP probe 방법을 사용한다.

  - TCP probe : 지정된 포트에 TCP 연결을 시도해 컨테이너 상태를 확인한다. 연결에 성공하면 서비스가 가능한 상태로 판단한다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: liveness-pod-tcp
spec:
  containers:
  - name: liveness
    image: k8s.gcr.io/goproxy:0.1
    imagePullPolicy: Always
    ports:
    - containerPort: 8080
    livenessProbe:
      tcpSocket:
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
```

### 2-10. startupProbe
  - 컨테이너 내 애플리케이션이 시작 되었는지 확인한다. startupProbe 를 사용하는 경우 애플리케이션 시작이 확인되기 전까지 다른 프로브를 활성화하지 않는다.