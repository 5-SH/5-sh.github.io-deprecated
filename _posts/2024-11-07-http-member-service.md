---
layout: post
title: HTTP 서버 활용 - 회원 관리 서비스
date: 2024-11-07 13:00:00 + 0900
categories: Java
ref: java, http, server
---

### 강의 : [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-2/dashboard)

# 12. HTTP 서버 활용 - 회원 관리 서비스

회원의 속성은 ID, Name, Age를 가진다. 회원을 등록하고 등록한 회원의 목록을 조회할 수 있어야 한다.    
기존에 구현한 HTTPServer를 재활용해 이전에 콘솔로 개발했던 기능을 웹으로 구현한다.    

```
1.회원 등록 | 2.회원 목록 조회 | 3.종료
선택: 1
ID 입력: id1
Name 입력: name1
Age 입력: 20
회원이 성공적으로 등록되었습니다.

1.회원 등록 | 2.회원 목록 조회 | 3.종료 선택: 1
ID 입력: id2
Name 입력: name2
Age 입력: 30
회원이 성공적으로 등록되었습니다.

1.회원 등록 | 2.회원 목록 조회 | 3.종료 선택: 2
회원 목록:
[ID: id1, Name: name1, Age: 20] [ID: id2, Name: name2, Age: 30]

1.회원 등록 | 2.회원 목록 조회 | 3.종료 선택: 3
프로그램을 종료합니다.
```

## 12-1. 회원 컨트롤러

```java
public class MemeberController {
    
    private final MemberRepository memberRepository;

    public MemberController(MemeberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Mapping("/")
    public void home(HttpResponse response) {
        String str = "<html><body>" +
                "<h1>Member Manager</h1>" +
                "<ul>" +
                "<li><a href='/members'>Member List</a></li>" +
                "<li><a href='/add-member-form'>Add New Member</a></li>" +
                "</ul>" +
                "</body></html>";
        response.writeBody(str);
    }

    @Mapping("/members")
    public void members(HttpResponse response) {
        List<Member>members = memberRepository.findAll();

        StringBuilder page = new StringBuilder();
        page.append("<html><body>");
        page.append("<h1>Member List</h1>");
        page.append("<ul>");
        for (Member member : members) {
            page.append("<li>")
                    .append("ID: ").append(member.getId())
                    .append(", Name: ").append(member.getName())
                    .append(", Age: ").append(member.getAge())
                    .append("</li>");
        }
        page.append("</ul>");
        page.append("<a href='/'>Back to Home</a>");
        page.append("</body></html>");
        response.writeBody(page.toString());
    }

    @Mapping("/add-member-form")
    public void home(HttpResponse response) {
        String body = "<html><body>" +
                "<h1>Add New Member</h1>" +
                "<form method='POST' action='/add-member'>" +
                "ID: <input type='text' name='id'><br>" +
                "Name: <input type='text' name='name'><br>" +
                "Age: <input type='text' name='age'><br>" +
                "<input type='submit' value='Add'>" +
                "</form>" +
                "<a href='/'>Back to Home</a>" +
                "</body></html>";
        response.writeBody(body);
    }

    @Mapping("/add-member")
    public void addMember(HttpRequest request, HttpResponse response) {
        log("MemberController.addMember");
        log("request = " + request);

        String id = request.getParameter("id");
        String name = request.getParameter("name");
        int age = Integer.parseInt(request.getParameter("age"));
        
        Member member = new Member(id, name, age);
        memberRepository.add(member);
        
        response.writeBody("<h1>save ok</h1>");
        response.writeBody("<a href='/'>Back to Home</a>");
    }
}
```

## 12-2. HTTpRequest - 메시지 바디 파싱

웹 화면에서 회원 등록 버튼을 누르면 요청 메시지을 아래와 같이 받는다.   

```
POST /add-member HTTP/1.1
Host: localhost:12345
Content-Length: 24
Content-Type: application/x-www-form-urlencoded
  
id=id1&name=name1&age=20
```

```java
public class HttpRequest {
    
    private final String method;
    private final String path;
    private final Map<String, String> queryParameters = new HashMap<>();
    private final Map<String, String> headers = new HashMap<>();

    public HttpRequest(BufferedReader reader) throws IOException {
        parseRequestLine(reader);
        parseHeaders(reader);
        parseBody(reader);
    }

    private void parseRequestLine(BufferedReader reader) throws IOException {
        String requestLine = reader.readLine();
        if (requestLine == null) throw new IOException("EOF: No request line received");

        String[] parts = requestLine.split(" ");
        if (parts.length != 3) throw new IOException("Invalid request line: " + requestLine);

        method = parts[0];
        String[] pathParts = parts[1].split("\\?");
        path = pathParts[0];

        if (pathParts.length > 1) parseQueryParameters(pathParts[1]);
    }

    private void parseQueryParameters(String queryString) {
        for (String param : queryString.split("&")) {
            String[] keyValue = param.split("=");
            String key = URLDecoder.decode(keyValue[0], StandardCharsets.UTF_8);
            String value = keyValue.length > 1 ? URLDecoder.decode(keyValue[1], StandardCharsets.UTF_8) : "";
            queryParameters.put(key, value);
        }
    }

    private void parseHeaders(BufferedReader reader) {
        String line;
        while (!(line = reader.readLine()).isEmpty()) {
            String[] headerParts = line.split(":");
            headers.put(headerParts[0].trim(), headerParts[1].trim());
        }
    }

    public void parseBody(BufferedReader reader) {
        if (!headers.containsKey("Content-Length")) return;

        int contentLength = Integer.parseInt(headers.get("Content-Length"));
        char[] bodyChars = new char[contentLength];

        int read = reader.read(bodyChars);
        if (read != contentLength) {
            throw new IOException("Failed to read entire body. Expected " + contentLength + " bytes, but read " + read);
        }

        String body = new String(bodyChars);
        log("HTTP Message Body: " + body);
        String contentType = headers.get("Content-Type");
        if ("application/x-www-form-urlencoded".equals(contentType)) {
            parseQueryParameters(body);
        }
    }

    public String getMethod() {
        return method;
    }

    public String getPath() {
        return path;
    }

    public String getParameter(String name) {
        return queryParameters.get(name);
    }

    public String getHeader(String name) {
        return headers.get(name);
    }

    @Override
    public String toString() {
        return "HttpRequest{" +
                "method='" + method + '\'' +
                ", path='" + path + '\'' +
                ", queryParameters=" + queryParameters +
                ", headers=" + headers +
                '}';
    }
}
```

## 12-3. 서버 메인

```java
public class MemberServerMain {
    private static final int PORT = 12345;
    
    public static void main(String[] args) throws IOException {
        
        MemberRepository memberRepository = new FileMemberRepository();
        MemberController memberController = new MemberController(memberRepository);
        HttpServlet servlet = new AnnotationServlet(List.of(memberController));
        
        ServletManager servletManager = new ServletManager();
        servletManager.add("/favicon.ico", new DiscardServlet());
        servletManager.setDefaultServlet(servlet);
        HttpServer server = new HttpServer(PORT, servletManager);
        server.start();
    } 
}
```

## 12-4. 결과

![image](https://github.com/user-attachments/assets/f9103114-d388-4e8e-87ce-cfe9dae74d73)

![image](https://github.com/user-attachments/assets/aa8b7409-2d34-488d-ae65-b5a2954854c0)

![image](https://github.com/user-attachments/assets/7a644635-0d91-4204-a631-ab423fbc5530)

![image](https://github.com/user-attachments/assets/815168e6-55cf-4df8-b781-4861a4c787b6)
