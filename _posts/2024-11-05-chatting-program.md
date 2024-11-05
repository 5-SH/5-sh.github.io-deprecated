---
layout: post
title: Java 채팅 프로그램
date: 2024-11-05 18:00:00 + 0900
categories: Java
ref: network, socket, chatting
---

### 강의 : [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-2/dashboard)

# 7. 채팅 프로그램

## 7-1. 설계

요구사항은 다음과 같다.
- 서버에 접속한 사용자는 모두 대화할 수 있어야 한다. 
- 다음과 같은 채팅 명령어가 있어야 한다.
    - 입장 `/join|{name}`
        - 처음 채팅 서버에 접속할 때 사용자의 이름을 입력해야 한다.
    - 메시지 `/message|{내용}`
        - 모든 사용자에게 메시지를 전달한다.
    - 이름 변경 `/change|{name}` 사용자의 이름을 변경한다.
        - 전체 사용자 `/users`
    - 채팅 서버에 접속한 전체 사용자 목록을 출력한다.
        - 종료 `/exit`
    - 채팅 서버의 접속을 종료한다.


## 7-2. 클라이언트

클라이언트에서 서버로 부터 오는 데이터를 읽는 동시에 사용자가 입력하는 값을 쓸 수 있도록 읽기/쓰기 핸들러를 만든다.   
읽기/쓰기 핸들러들은 Runnable을 구현하고 Thread를 통해 실행해 동시에 작업할 수 있다.   
   
ReadHandler, WriteHandler에서 예외가 발생하면 Client를 종료할 수 있도록 한다.    
Client는 Socket, DataInputStream, DataOutputStream 자원을 정리하고    
Readhandler.close() 와 WriteHandler.close()는 중복 호출될 수 있으므로 synchronized 처리한다.   

```java
public class ReadHandler implements Runnable {

    private final DataInputStream input;
    private final Client client;
    private boolean closed = false;

    public ReadHandler(DataInputStream input, Client client) {
        this.input = input;
        this.client = client;
    }

    @Override
    public void run() {
        try {
            while (true) {
                String received = input.readUTF();
                log("client <- server: " + received);
            }
        } catch (IOException e) {
            log(e);
        } finally {
            client.close();
        }
    }

    public synchronized void close() {
        if (closed) return;

        closed = true;
        log("read handler 종료");
    }
}

public class WriteHandler implements Runnable {

    private final DataOutputStream output;
    private final Client client;
    private final String DELEMITER = "|";
    private boolean closed = false;

    public WriteHandler(DataOutputStream output, Client client) {
        this.output = output;
        this.client = client;
    }

    @Override
    public void run() {
        try {
            Scanner scanner = new Scanner(System.in);

            String username = inputUsername(scanner);
            output.writeUTF("/join" + DELEMITER + username);

            while (true) {
                String toSend = scanner.nextLine();

                if (toSend.isEmpty()) continue;

                if (toSend.equals("/exit")) {
                    output.writeUTF(toSend);
                    break;
                }

                if (toSend.startsWith("/")) {
                    output.writeUTF(toSend);
                } else {
                    output.writeUTF("/message" + DELEMITER + toSend);
                }
            }
        } catch (IOException | NoSuchElementException e) {
            log(e);
        } finally {
            client.close();
        }
    }

    private static String inputUsername(Scanner scanner) {
        System.out.println("이름을 입력하세요.");
        String username;
        do {
            username = scanner.nextLine();
        } while (username.isEmpty());
        return username;
    }

    public synchronized void close() {
        if (closed) return;

        try {
            System.in.close();
        } catch (IOException e) {
            log(e);
        }

        closed = true;
        log("write handler 종료");
    }
}
```

```java
public class Client {

    private final String host;
    private final int port;
    private Socket socket;
    private DataInputStream input;
    private DataOutputStream output;
    private ReadHandler readHandler;
    private WriteHandler writeHandler;
    private boolean closed = false;

    public Client(String host, int port) {
        this.host = host;
        this.port = port;
    }

    public void start() throws IOException {
        this.socket = new Socket(host, port);
        this.input = new DataInputStream(socket.getInputStream());
        this.output = new DataOutputStream(socket.getOutputStream());

        this.readHandler = new ReadHandler(input, this);
        this.writeHandler = new WriteHandler(output, this);

        Thread readThread = new Thread(readHandler, "readThread");
        Thread writeThread = new Thread(writeHandler, "writeThread");

        readThread.start();
        writeThread.start();
    }

    public synchronized void close() {
        if (closed) return;

        readHandler.close();
        writeHandler.close();
        closeAll(socket, input, output);
        closed = true;
        log("Client 종료");
    }
}
```

```java
public class ClientMain {
    public static void main(String[] args) throws IOException {
        Client client = new Client("localhost", 12345);
        client.start();
    }
}
```

## 7-3. 서버

여러 클라이언트와 연결하고 요청을 처리할 수 있도록 서버의 동작은 Session 클래스에 작성한다.    
Session 클래스는 클라이언트의 API 요청을 받고 처리하고 Thread로 실행한다.   
   
API 별 동작을 if-else로 개발하지 않고 유지보수와 기능 추가가 편리하도록 커맨드 패턴을 활용한다.   
API 별 동작은 Command 인터페이스를 구현한 JoinCommand, MessageCommand, ChangeCommand, ExitCommand에 개발한다.   
   
Command 들은 CommandManager 클래스에서 생성되고 관리된다.   
CommandManager의 commands HashMap에서 요청마다 필요한 커맨드를 가져와 사용한다.    
   
커맨드 패턴을 사용하면 작업을 호출하는 객체와 작업을 수행하는 객체를 부닐할 수 있고    
기존 코드를 변경하지 않고 새로운 명령을 추가할 수 있다.   
단순한 if문 몇 개로 문제를 해결할 수 있으면 커맨드 패턴을 사용할 필요가 없지만    
기능이 많고 앞으로 추가와 수정이 많을 것이라 예상 된다면 커맨드 패턴을 사용하는 것이 좋다.   
   
CommandManager에서 필요한 커맨드를 가져올 때   
Null Object Pattern을 사용해 요청에 맞는 커맨드가 없으면 DefaultCommand를 가져와 사용하도록 한다.    
Null Object Pattern을 사용하면 코드에서 null 체크를 할 필요가 없어져 불필요한 조건문을 줄이고 객체의 기본 동작을 정의하는데 유용하다.   

```java
public class Session implements Runnable {

    private final Socket socket;
    private final DataInputStream input;
    private final DataOutputStream output;
    private final SessionManager sessionManager;
    private final CommandManager commandManager;
    private boolean closed = false;
    private String username;

    public Session(Socket socket, SessionManager sessionManager, CommandManager commandManager) throws IOException {
        this.socket = socket;
        this.input = new DataInputStream(socket.getInputStream());
        this.output = new DataOutputStream(socket.getOutputStream());
        this.commandManager = commandManager;
        this.sessionManager = sessionManager;
        this.sessionManager.add(this);
    }

    @Override
    public void run() {
        try {
            while (true) {
                String received = input.readUTF();
                log("client -> server: " + received);
                commandManager.execute(received, this);
            }
        } catch (IOException e) {
            log(e);
        } finally {
            sessionManager.remove(this);
            sessionManager.sendAll(username + "님이 퇴장했습니다.");
            close();
        }
    }

    public void send(String message) throws IOException {
        log("server -> client: " + message);
        output.writeUTF(message);
    }

    public synchronized void close() {
        if (closed) return;

        closeAll(socket, input, output);
        closed = true;
        log("연결 종료: " + socket);
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
```

```java
public class SessionManager {

    private final ArrayList<Session> sessions= new ArrayList<>();

    public void add(Session session) {
        sessions.add(session);
    }

    public void remove(Session session) {
        sessions.remove(session);
    }

    public void sendAll(String message) {
        try {
            for (Session session : sessions) session.send(message);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public synchronized List<String> getAllUsername() {
        List<String> usernames = new ArrayList<>();
        for (Session session : sessions) {
            if (!session.getUsername().isEmpty()) {
                usernames.add(session.getUsername());
            }
        }

        return usernames;
    }

    public synchronized void closeAll() {
        for (Session session : sessions) session.close();
        sessions.clear();
    }
}
```

```java
public interface Command {
    void execute(String[] args, Session session) throws IOException;
}

public class JoinCommand implements Command {

    private final SessionManager sessionManager;

    public JoinCommand(SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @Override
    public void execute(String[] args, Session session) throws IOException {
        String username = args[1];
        session.setUsername(username);
        sessionManager.sendAll(username + "님이 입장했습니다.");
    }
}

public class MessageCommand implements Command {

    private final SessionManager sessionManager;

    public MessageCommand(SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @Override
    public void execute(String[] args, Session session) throws IOException {
        String message = args[1];
        sessionManager.sendAll("[" + session.getUsername() + "]" + message);
    }
}

public class ChangeCommand implements Command {

    private final SessionManager sessionManager;

    public ChangeCommand(SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @Override
    public void execute(String[] args, Session session) throws IOException {
        String changeName = args[1];
        sessionManager.sendAll(session.getUsername() + "님이 " + changeName + "로 이름을 변경했습니다.");
        session.setUsername(changeName);
    }
}

public class UsersCommand implements Command {

    private final SessionManager sessionManager;

    public UsersCommand(SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @Override
    public void execute(String[] args, Session session) throws IOException {
        List<String> usernames = sessionManager.getAllUsername();
        StringBuilder sb = new StringBuilder();
        sb.append("전체 접속자 : ").append(usernames.size()).append("\n");
        for (String username : usernames) {
            sb.append(" - ").append(username).append("\n");
        }
        session.send(sb.toString());
    }
}

public class ExitCommand implements Command {

    private final SessionManager sessionManager;

    public ExitCommand(SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @Override
    public void execute(String[] args, Session session) throws IOException {
        throw new IOException("exit");
    }
}

public class DefaultCommand implements Command {

    @Override
    public void execute(String[] args, Session session) throws IOException {
        session.send("처리할 수 없는 명령어 입니다: " + Arrays.toString(args));
    }
}
```

```java
public class CommandManagerV4 implements CommandManager {

    public static final String DELIMITER = "\\|";
    private final Map<String, Command> commands = new HashMap<>();

    public CommandManagerV4(SessionManager sessionManager) {
        commands.put("/join", new JoinCommand(sessionManager));
        commands.put("/message", new MessageCommand(sessionManager));
        commands.put("/change", new ChangeCommand(sessionManager));
        commands.put("/users", new UsersCommand(sessionManager));
        commands.put("/exit", new ExitCommand(sessionManager));
    }

    @Override
    public void execute(String totalMessage, Session session) throws IOException {
        String[] args = totalMessage.split(DELIMITER);
        String key = args[0];

        Command command = commands.getOrDefault(key, new DefaultCommand());
        command.execute(args, session);
    }
}
```

```java
public class Server {

    private final int port;
    private final SessionManager sessionManager;
    private final CommandManager commandManager;

    public Server (int port, SessionManager sessionManager, CommandManager commandManager) {
        this.port = port;
        this.sessionManager = sessionManager;
        this.commandManager = commandManager;
    }

    public void start() throws IOException {
        ServerSocket serverSocket = new ServerSocket(port);

        addShutdownHook(serverSocket);

        running(serverSocket);
    }

    private void addShutdownHook(ServerSocket serverSocket) {
        Runtime.getRuntime().addShutdownHook(new Thread(new ShutdownHook(serverSocket, sessionManager), "shutdown"));
    }

    private void running(ServerSocket serverSocket) {
        try {
            while (true) {
                Socket socket = serverSocket.accept();
                log("소캣 연결: " + socket);
                Thread thread = new Thread(new Session(socket, sessionManager, commandManager));
                thread.start();
            }
        } catch (IOException e) {
            log("서버 소캣 종료: " + e);
        }
    }

    static class ShutdownHook implements Runnable {
        private final ServerSocket serverSocket;
        private final SessionManager sessionManager;

        public ShutdownHook(ServerSocket serverSocket, SessionManager sessionManager) {
            this.serverSocket = serverSocket;
            this.sessionManager = sessionManager;
        }

        @Override
        public void run() {
            log("shutdownHook 실행");
            try {
                serverSocket.close();
                sessionManager.closeAll();

                Thread.sleep(1000);
            } catch (IOException | InterruptedException e) {
                log(e);
            }
        }
    }
}
```

```java
public class ServerMain {

    public static void main(String[] args) throws IOException {
        SessionManager sessionManager = new SessionManager();
        CommandManager commandManager = new CommandManagerV4(sessionManager);
        Server server = new Server(12345, sessionManager, commandManager);
        server.start();
    }
}
```