---
layout: post
title: Reactor 패턴
date: 2023-01-05 20:30:00 + 0900
categories: Patterns
ref: Patterns, dispatcher, reactor
---

출처1 : SW 아키텍처 설계 강의(IMQA 손영수 상무)

# Reactor 패턴

요청을 처리하는 핸들러들을 가지고 있고 각 요청에 맞는 핸들러로 처리해 프로토콜 추가에 유연한 Dispathcer 입니다.

## 1. Dispatcher 패턴

### 1-1. 디스패처 패턴이란
리액터 패턴을 알아보기전 디스패처 패턴을 먼저 알아보겠습니다.   

서버는 여러가지 일을 복합적으로 처리하기 때문에 다양한 형식의 메시지를 받게 됩니다.     
서버의 기능이 추가, 수정되면 수신하는 메시지의 형식도 추가, 수정되게 됩니다.    
따라서 메시지의 형식에 따라 처리하는 로직을 효율적으로 나눠줄 수 있어야 하고, 메시지 형식과 처리하는 로직을 쉽게 추가하거나 수정할 수 있어야 합니다.    

이 문제를 메시지를 처리할 로직을 선택하는 __디스패처__ 와 메시지의 요청을 처리하는 __프로토콜__ 를 사용해 해결합니다.    

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/210794541-d1b698ea-8a11-402a-aa6b-ba148d3d0fe9.png" width="75%"/>
  <figcaption>디스패처 패턴 구조도</figcaption>
</figure>  

### 1-2. 디스패처 패턴 예제
서버가 클라이언트에게 "0x5001|홍길동|22" 와 같은 메시지를 받으면 사용자를 조회하고    
"0x6001|hong|1234|홍길동|22|남성" 을 받으면 사용자 정보를 수정하는 작업을 한다고 가정하겠습니다.   

서버 측의 소켓은 클라이언트와 연결이 되면 데이터를 받아 적절한 로직에게 나눠줘야(메시지 디멀티플렉싱) 합니다.    
데이터를 받아 적절한 로직을 찾아 전달하는 부분을 디스패처에 구현하고 메시지를 처리하는 로직은 프로토콜에 구현하도록 하겠습니다.    

```java
public class Dispatcher {
	private final int HEADER_SIZE = 6;
	
	public void dispatch(ServerSocket serverSocket) {
		// TODO Auto-generated method stub
		try {
			Socket socket = serverSocket.accept();
			demultiplex(socket);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	public void demultiplex(Socket socket) {
		try {
			InputStream inputStream = socket.getInputStream();
			
			byte[] buffer = new byte[HEADER_SIZE];
			inputStream.read(buffer);
			String header = new String(buffer);
			
			switch (header) {
				case "0x5001":
					StreamSayHelloProtocol sayHelloProtocol = new StreamSayHelloProtocol();
					sayHelloProtocol.handleEvent(inputStream);
					break;
				case "0x6001":
					StreamUpdateProfileProtocol updateProfileProtocol = new StreamUpdateProfileProtocol();
					updateProfileProtocol.handleEvent(inputStream);
					break;
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
}

// "0x5001|홍길동|22" 메시지 처리
public class StreamSayHelloProtocol {
	
	private static final int DATA_SIZE = 512;
	private static final int TOKEN_NUM = 2;
	
	public void handleEvent(InputStream inputStream) {
		try {
			byte[] buffer = new byte[DATA_SIZE];
			inputStream.read(buffer);
			String data = new String(buffer);
			
			String[] params = new String[TOKEN_NUM];
			StringTokenizer token = new StringTokenizer(data, "|");
			
			int i = 0;
			while (token.hasMoreTokens()) {
				params[i] = token.nextToken();
				++i;
			}
			
			sayHello(params);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	private void sayHello(String[] params) {
		System.out.println("SayHello -> name : " + params[0] + " age : " + params[1]);
	}
}


// "0x6001|hong|1234|홍길동|22|남성" 메시지 처리
public class StreamUpdateProfileProtocol {
	
	private static final int DATA_SIZE = 1024;
	private static final int TOKEN_NUM = 5;
	
	public void handleEvent(InputStream inputStream) {
		try {
			byte[] buffer = new byte[DATA_SIZE];
			inputStream.read(buffer);
			String data = new String(buffer);
			
			String[] params = new String[TOKEN_NUM];
			StringTokenizer token = new StringTokenizer(data, "|");
			
			int i = 0;
			while (token.hasMoreTokens()) {
				params[i] = token.nextToken();
				++i;
			}
			
			updateProfile(params);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	private void updateProfile(String[] params) {
		System.out.println("UpdateProfile -> " +
				" id :" + params[0] +
				" password : " + params[1] +
				" name : " + params[2] +
				" age : " + params[3] + 
				" gender : " + params[4]);
	}
}
```

메인 함수에서 아래와 같이 디스패처를 실행하면 클라이언트의 메시지를 받아 처리할 수 있게 됩니다.   

```java
public class ServerInitializer {

	public static void main(String[] args) {
		int port = 5000;
		System.out.println("Server ON : " + port);
		
		try {
			ServerSocket serverSocket = new ServerSocket(port);
			Dispatcher dispatcher = new Dispatcher();
			while (true) {
				dispatcher.dispatch(serverSocket);
			}
			
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
}
```

디스패처 패턴은 0x7001, 0x8001, 0x9001 ... 같이 메시지 형식과 프로토콜이 추가되게 되면   
Dispatcher 의 demltiplex 에 switch 구문에 case 를 계속 추가해야 하는 문제가 있습니다.    
이 문제를 해결하기 위해 핸들러를 통해 요청을 처리하는 리액터 패턴을 사용합니다.    

## 2. Reactor 패턴
