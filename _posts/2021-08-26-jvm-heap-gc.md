---
layout: post
title: JVM & JVM Heap & JVM GC
date: 2021-08-26 19:00:00 + 0900
categories: Java
ref: Java, JVM, Heap, GC
---

출처1 : https://www.youtube.com/watch?v=UzaGOXKVhwU&ab_channel=%EC%9A%B0%EC%95%84%ED%95%9CTech   
출처2 : https://www.artima.com/insidejvm/ed2/jvm8.html

# JVM & JVM Heap
## 1. JVM 이란?
### 1) JVM 이전
- 자바 이전 개발에 주로 사용한 c/c++ 경우 컴파일 시 플랫폼에 의존성을 가진다.
- 플랫폼 : os + cpu   
  os : system call interface 가 os 마다 다르다.   
  cpu : 인스트럭션 아키텍처가 cpu 마다 다르다.   
  → byte code representation 이 플랫폼 마다 다르게 나온다.
- 타겟 플랫폼이 다를 경우 프로그램이 동작하지 않는다.
- 크로스 컴파일 : 리눅스 에서 컴파일 한 것은 윈도우즈 에서 실행이 안된다.   
  → 리눅스에서 윈도우즈를 타겟으로 컴파일을 한다.

### 2) JVM (Java Virtual Machine)
- 자바가 릴리즈 되던 당시 네트워크의 발전으로, 네트워크를 통해 연결된 디바이스에 프로그램을 전달하면   
모든 디바이스에서 동작하는 것이 필요했었다.
- 자바는 플랫폼에 의존하지 않도록 설계했다.
![FT_2021-08-26 15_44_14 702](https://user-images.githubusercontent.com/13375810/130914324-eaf9f405-4ba6-4703-a2c8-44953ceafcfa.png)
  
### 3) 자바의 큰그림
![FT_2021-08-26 15_50_16 323](https://user-images.githubusercontent.com/13375810/130915059-de80a7d6-dcf3-469a-b5d9-9a0fbaf2194d.png)
- 이 구조대로 자바스크립트가 브라우저에서 동작한다.

### 4) 자바 코드가 실행되기 까지
![FT_2021-08-26 15_53_54 069](https://user-images.githubusercontent.com/13375810/130915569-bf1e4688-9a11-4d42-a372-bc070b3cfa30.png)

<br/>

## 2. JVM Heap 구조
![FT_2021-08-26 16_00_54 591](https://user-images.githubusercontent.com/13375810/130916523-7d665773-1207-4a01-b78f-0b65337290ea.png)

- method area : class loader 가 class 파일을 읽어 왔을때, 클래스에 있는 정보들을 파싱해서 method area 에 저장한다.
- heap : 프로그램을 실행하며 생성되는 모듈 객체를 heap 에 저장한다.
- program counter : 각 스레드는 메서드를 실행하고 있고, program counter 는 그 메서드 의 몇 번째 byte code 를 실행햐아 하는지 기억한다.
- stack : 스레드 별로 1 개씩 존재한다. 스택 프레임은 스레드가 호출될 때마다 생성되어 스택에 쌓이고 메서드 실행이 끝나면 스택 프레임은 pop 되어 스택에서 사라진다.
- stack frame : 바이트코드 실행에 필요한 것들이 저장되어 있다. local variable array, operand stack, frame data, 이전 스택 프레임에 대한 정보 등이 들어있다.   
그리고 frame data 에는 constant pool 에 대한 참조, 메소드 실행 중 예외 처리(catch)를 위한 예외 테이블에 대한 참조 그리고 메서드 반환 정보가 들어있다.
- native method stack : 성능 향상을 위해 자바 바이트코드가 아닌 c, c++ 로 작성된 코드를 컴파일해서 사용하는 경우, 그 메서드를 실행하기 위한 정보가 저장되어 있다.

![FT_2021-08-26 16_52_10 088](https://user-images.githubusercontent.com/13375810/130923767-884a67ba-38a8-461e-ab44-7104a181e29f.png)

<br/>

## 2. JVM 의 GC

### 1) GC
#### Mark & Sweep & Compact
- mark : GC 가 stack 의 모든 변수를 스캔하며 각각 어떤 객체를 참조하는지 찾아서 마킹한다.   
reachable object 가 참조하고 있는 객체를 찾아서 마킹한다.
- sweep : 마킹되지 않은 객체를 Heap 에서 제거한다.
- compact : 제거한 후 남은 객체를 모아 메모리 fragment 를 줄인다.

### 2) Heap 의 구조와 GC
#### New Generation 영역의 GC
![FT_2021-08-26 17_25_38 434](https://user-images.githubusercontent.com/13375810/130928931-a7ae8e9b-99ed-4447-a945-fc1c046b0d3a.png)

#### Old Generation 영역의 GC
![FT_2021-08-26 17_33_31 507](https://user-images.githubusercontent.com/13375810/130930031-3f5c09dc-4be0-4e50-8afb-19003ae7a6de.png)

## 3. GC 의 종류

### 1) Serial GC 
GC 를 수행하는 스레드가 1개이다. cpu 가 한 개만 있을때 사용하는 방식. Mark-Sweep-Compact 알고리즘을 사용한다.   

### 2) Parallel GC 
GC 를 처리하는 스레드가 여러 개이다. Serial GC 보다 빠르게 GC 를 처리한다.

![FT_2021-08-26 17_43_48 671](https://user-images.githubusercontent.com/13375810/130931893-59573b30-5d44-4c5f-b2f7-5db18330b3d0.png)

### 3) Concurrent Mark & Sweep GC 
jvm 실행과 동시에 GC 를 수행해 stop the world 시간을 줄인다.    
Compatction 단계를 수행하지 않는다.

#### stop the world
GC 를 실행하기 위해 JVM 이 실행을 멈추는 것.   
stop the world 가 발생하면 GC 를 실행하는 스레드를 제외하고 모두 멈춘다.   
GC 가 완료된 이후 작업을 다시 시작한다.

![FT_2021-08-26 17_45_13 983](https://user-images.githubusercontent.com/13375810/130931900-8b5a73ab-039b-4d6c-a7b0-5c775fe28936.png)