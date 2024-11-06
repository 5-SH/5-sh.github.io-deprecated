---
layout: post
title: Java 네트워크 프로그램
date: 2024-11-05 13:00:00 + 0900
categories: Java
ref: network, socket
---

### 강의 : [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-2/dashboard)

# 6. 네트워크 프로그램

클라이언트가 문자를 서버에 전달하면 서버는 클라이언트의 요청에 " World"라는 단어를 더해서 응답하는 채팅 프로그램을 만든다.   
서버는 한 번에 여러 클라이언트와 연결할 수 있고 클라이언트와 서버가 종료될 때 자원이 잘 정리될 수 있도록 개발한다.   
<br/>
서버가 여러 클라이언트와 연결될 수 있도록 클라이언트의 요청을 처리하는 SessionV6 클래스를 만든다.    
SessionV6 클래스는 Runnable 인터페이스를 구현해 Thread로 실행할 수 있고    
run() 오버라이드 메서드 안에 클라이언트의 메시지를 받아 응답하는 작업을 구현한다.   
서버는 클라이언트의 연결 요청을 serverSocket.accept()에서 받고 Socket을 넘겨주며 SessionV6 인스턴스를 생성한다.    
그리고 SessionV6 인스턴스는 Thread로 실행한다.   
<br/>
SocketCloseUtil에 InputStream, OutputStream, Socket 자원을 정리를 돕는 코드를 작성한다.   
자원 정리 중 예외가 발생 했을 때 다른 자원을 정리하는데 영향을 주지 않도록 예외 처리를 했다.   
자원 정리 중 발생한 예외는 별도의 처리가 필요하지 않고 로그를 남겨 개발자에게 알려주면 된다.    
<br/>
SessionV6 클래스의 close() 메서드는 클라이언트와 연결이 종료 되었을 때 input.readUTF()에서 예외가 발생해 호출 될 수 있고,    
서버가 종료 되었을 때 호출 될 수 있어 동시에 호출 될 수 있다. 그래서 synchornized와 closed 변수를 통해 동시에 실행되지 않도록 한다.   
<br/>
Runtime.getRuntime().addShutdownHook()을 사용하면 자바 종료 시 호출되는 셧다운 훅을 등록할 수 있다.    
셧다운 훅이 호출 되었을 때 서버의 자원을 정리하도록 ShutdownHook 스레드를 만들어 등록한다.   

## 6-1. 클라이언트

```java
public class SocketCloseUtil {
    public static void closeAll(Socket socket, InputStream input, OutputStream output) {
        close(input);
        close(output);
        close(socket);
    }

    public static void close(InputStream input) {
        if (input != null) {
            try {
                input.close();
            } catch (IOException e) {
                log(e.getMessage());   
            }
        }
    }

    public static void close(OutputStream output) {
        if (output != null) {
            try {
                output.close():
            } catch (IOException e) {
                log(e.getMessage());
            }
        }
    }

    public static void close(Socket socket) {
        if (socket != null) {
            try {
                socket.close();
            } catch (IOException e) {
                log(e.getMassage());
            }
        }
    }
}

public class ClientV6 {
    private static final int PORT = 12345;

    public static void main(String[] args) throws IOException {
        log("클라이언트 시작");

        Socket socket = null;
        DataInputStream input = null;
        DataOutputStream output = null;

        try {
            socket = new Socket("localhost", PORT);
            input = new DataInputStream(socket.getInputStream());
            output = new DataOutputStream(socket.getOutputStream()));

            Scanner scanner = new Scanner(System.in);
            while (true) {
                System.out.println("전송 문자: ");
                String toSend = scanner.nextLine();

                output.writeUTF(toSend);
                log("client -> server: " + toSend);

                if (toSend.equals("exit")) {
                    break;
                }

                String received = input.readUTF();
                log("client <- server: " + received);
            }
        } catch (IOException e) {
            log(e)
        } finally {
            closeAll(socket, input, output);
            log("연결 종료: " + socket);
        }
    }
}
```

## 6-2. 서버

```java
public class SessionV6 implements Runnable {

    private final Socket socket;
    private final DataInputStream input;
    private final DataOutputStream output;
    private final SessionManagerV6 sessionManager;
    private boolean closed = false;

    public SessionV6(Socket socket, SessionManagerV6 sessionManager) {
        this.socket = socket;
        this.DataInputStream = new DataInputStream(socket.getInputStream());
        this.DataOutputStream = new DataOutputStream(socket.getOutputStream());
        this.sessionManager = sessionManager;
        sessionManager.add(this);
    }

    @Override
    public void run() {
        try {
            while (true) {
                String received = input.readUTF();
                log("client -> server: " + received);

                if (received.equals("exit")) {
                    break;
                }

                String toSend = received + " World!";
                output.writeUTF(toSend);
                log("client <- server: " + toSend);
            }
        } catch (IOException e) {
            log(e);
        } finally {
            sessionManager.remove(this);
            close();
        }
    }

    public synchronized void close() {
        if (closed) {
            return;
        }

        closeAll(socket, input, output);
        closed = true;
        log("연결 종료: " + socket + " isClosed: " + socket.isClosed());
    }
}

public class SessionManagerV6 {
    private List<SessionV6> sessions = new ArrayList<>();

    public synchronized add(SessionV6 session) {
        sessions.add(session);
    }

    public synchronized remove(SessionV6 session) {
        sessions.remove(session);
    }

    public synchronized void closeAll() {
        for (SessionV6 session : sessions) {
            session.close();
        }
        sessions.clear();
    }
}

public class ServerV6 {

    private static final int PORT = 12345;

    public static void main(String[] args) throws IOException {
        log("서버 시작");
        
        SessionManagerV6 sessionManager = new SessionManagerV6();
        ServerSocket serverSocket = new ServerSocket(PORT);
        log("서버 소켓 시작 - 리스닝 포트: " + PORT);

        ShutdownHook shutdownHook = new ShutdownHook(serverSocket, sessionManager);
        Runtime.getRuntime().addShutdownHook(new Thread(shutdownHook, "shutdown"));

        try {
            while (true) {
                Socket socket = serverSocket.accept();
                log("소켓 연결: " + socket);

                SessionV6 session = new SessionV6(socket, sessionManager);
                Thread thread = new Thread(session);
                thread.start();
            }
        } catch (IOException e) {
            log("서버 소켓 종료: " + e);
        }
    }

    static class ShutdownHook implements Runnable {

        ServerSocket serverSocket;
        SessionManagerV6 sessionManager;

        public ShutdownHook(ServerSocket serverSocket, SessionManagerV6 sessionManager) {
            this.serverSocket = serverSocket;
            this.sessionManager = sessionManager;
        }

        @Override
        public void run() {
            log("shutdownHook 실행");
            try {
                sessionManager.closeAll();
                serverSocket.close();

                Thread.sleep(1000);
            } catch (Exception e) {
                e.printStackTrace();
                System.out.println("e = " + e);
            }
        }
    }
}
```

## 6-3. try-with-resource 예외처리

try-with-resource를 적용해 자원을 정리할 수 있다.    
try-with-resource에서 자원을 정리할 수 있으려면 선언되는 자원이 AutoCloseable을 구현해야 한다.    
InputStream, OutputStream, Socket 모두 AutoCloseable을 구현하고 있다.   
자원 정리 시 try-with-resources에 선언되는 순서의 반대로 자원 정리가 적용되기 때문에 output, input, socket 순서로 close()가 호출된다.   
<br/>
try-with-resource에서 자원 정리 중 에러가 발생하면 내부적으로 예외를 처리해 다른 자원을 정리하는데 방해를 받지 않도록 한다.   
그리고 try-catch-finally 구문의 finally 에서 자원을 정리하도록 구현 했을때,    
try 구문에서 예외가 발생해 자원을 정리하고 있는데 finally 구문에서 자원 정리 중에 또 예외가 발생할 경우    
핵심 예외가 자원 정리 중 생성된 예외로 바뀌어 받게 될 수 있다.    
try-with-resource에서는 같은 상황 일 때 try 구문에서 발생한 핵심 예외를 반환하고 자원 정리 중 발생한 부가 예외는 Suppressed로 담아서 반환한다.    
자원 정리 중에 발생한 부가 예외는 e.getSuppressed()를 통해 활용할 수 있다.   

#### 클라이언트

```java
public class ClientV5 {

    private static final int PORT = 12345;

    public static void main(String[] args) {
        log("클라이언트 시작");

        try (Socket socket = new Socket("localhost", PORT)
            DataInputStream input = new DataInputStream(socket.getInputStream())
            DataOutputstream output = new DataOutputStream(socket.getOutputStream())) {
            
            Scanner scanner = new Scanner(System.in);    
            while (true) {
                System.out.println("전송 문자: ");
                String toSend = scanner.nextLine();

                output.writeUTF(toSend);
                log("client -> server: " + toSend);

                if (toSend.equals("exit")) break;

                String receive = input.readUTF();
                log("client <- server: " + received);
            }

            String received = input.readUTF();
        } catch (IOException e) {
            log(e);
        }

    }
}
```

#### 서버

```java
public class SessionV5 implements Runnable {

    private final Socket socket;

    public SessionV5(Socket socket) {
        this.socket = socket;
    }

    @Override
    public void run() {

        try (DataInputStream input = new DataInputStream(socket.getInputStream());
            DataOutputStream output = new DataOutputStream(socket.getOutputStream())) {

            while (true) {
                // 클라이언트로부터 문자 받기
                String received = input.readUTF(); // 블로킹
                log("client -> server: " + received);

                // 클라이언트 종료 . 서버도 함께 종료
                if (received.equals("exit")) {
                    break;
                }

                // 클라이언트에게 문자 보내기
                String toSend = received + " World!";
                output.writeUTF(toSend);
                log("client - server: " + toSend);
            }
        } catch (IOException e) {
            log(e);
        }

        log("연결 종료: " + socket + " isClosed: " + socket.isClosed());
    }
}
```

try-with-resource는 자원의 선언과 정리를 묶어서 처리할 때 사용한다.   
try-with-resource에서 선언된 자원을 try 구문 안에서만 사용할 수 있다. 그리고 자원들은 try 구문이 끝나는 시점에 정리된다.   
그래서 서버를 종료하는 시점에 자원을 정리하는 것은 Session 안에 있는 try-with-resource를 통해 할 수 없다.   
따라서 ShutdownHook을 활용해 서버가 종료될 때 자원을 정리하도록 하려면 try-catch-finally을 사용해야 한다.   