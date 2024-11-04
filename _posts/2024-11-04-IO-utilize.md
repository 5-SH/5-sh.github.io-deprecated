---
layout: post
title: Java I/O 활용
date: 2024-11-04 15:00:00 + 0900
categories: Java
ref: IO, I/O, input, output, stream
---

### 강의 : [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-2/dashboard)

# 4. I/O 활용

I/O를 사용해서 회원 데이터를 관리하는 예제

## 4-1. 요구사항
```
1.회원 등록 | 2.회원 목록 조회 | 3.종료 선택: 1
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

## 4-2. 회원 관리 예제1 - 메모리

#### 회원 클래스

```java
public class Member {
    private String id;
    private String name;
    private Integer age;

    public Member() {
    }

    public Member(String id, String name, Integer age) {
        this.id = id;
        this.name = name;
        this.age = age;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    @Override
    public String toString() {
        return "Member{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", age=" + age +
                '}';
    }
}
```

#### 회원을 저장하고 관리하는 인터페이스

```java
public interface MemberRepository {
    void add(Member member);

    List<Member> findAll();
}
```

#### 메모리에 회원을 저장하고 관리하는 구현체

```java
public class MemoryMemberRepository implements MemberRepository {

    private final List<Member> members = new ArrayList<>();

    @Override
    public void add(Member member) {
        members.add(member);
    }

    @Override
    public List<Member> findAll() {
        return members;
    }
}
```

#### 프로그램 main

```java
public class MemberConsoleMain {

    private static final MemberRepository repository = new MemoryMemberRepository();

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        while (true) {
            System.out.println("1.회원 등록 | 2.회원 목록 조회 | 3.종료");
            System.out.print("선택: ");
            int choice = scanner.nextInt();
            scanner.nextLine();

            switch (choice) {
                case 1:
                    registerMember(scanner);
                    break;
                case 2:
                    displayMembers();
                    break;
                case 3:
                    System.out.println("프로그램을 종료합니다.");
                    return;
                default:
                    System.out.println("잘못된 선택입니다. 다시 입력하세요.");
            }
        }
    }

    private static void registerMember(Scanner scanner) {
        System.out.print("ID 입력: ");
        String id = scanner.nextLine();

        System.out.print("Name 입력: ");
        String name = scanner.nextLine();

        System.out.print("Age 입력: ");
        int age = scanner.nextInt();
        scanner.nextLine();

        Member newMember = new Member(id, name, age);
        repository.add(newMember);
        System.out.println("회원이 성공적으로 등록되었습니다.");
    }

    private static void displayMembers() {
        List<Member> members = repository.findAll();
        System.out.println("회원 목록:");
        for (Member member : members) {
            System.out.printf("[ID: %s, Name: %s, Age: %d]\n", member.getId(), member.getName(), member.getAge());
        }
    }
}
```

## 4-3. 회원 관리 예제2 - 파일에 보관

회원 정보는 문자로 저장되고 문자를 다룰 땐 Reader Writer 클래스를 사용하는 것이 편리하다.   
그리고 한 줄 단위로 처리할 때는 BufferedReader가 유용하므로 BufferedReader, BufferedWriter를 사용한다.   
FileWriter(FILE_PATH, UTF_8, true) 에서 true는 파일에 덮어쓰지 않고 끝에 추가하도록 한다.   
   
try-with-resources 구문을 사용해서 자동으로 자원을 정리한다. try 블록이 끝나면 자동으로 close()가 호출되면서 자원을 정리한다.   
try-with-resources 구문을 사용하면 자원들을 정리하는 중에 예외가 발생해도 중단되지 않고 이어서 다른 자원들을 정리할 수 있도록 해준다.   

```java
public class FileMemberRepository implements MemberRepository {

    private static final String FILE_PATH = "temp/members-txt.dat";
    private static final String DELIMITER = ", ";

    @Override
    public void add(Member member) {
        try (BufferedWriter bw = new BufferedWriter(new FileWriter(FILE_PATH, UTF_8, true))) {
            bw.write(member.getId() + DELIMITER + member.getName() + DELIMITER + member.getAge());
            bw.newLine();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public List<Member> findAll() {
        List<Member> members = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(FILE_PATH, UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) {
                String[] memberData = line.split(DELIMITER);
                members.add(new Member(memberData[0], memberData[1], Integer.valueOf(memberData[2])));
            }
            return members;
        } catch (FileNotFoundException e) {
          return new ArrayList<>();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
```

실행을 위한 main 함수에 private static final MemberRepository repository = new MemoryMemberRepository(); 대신    
private static final MemberRepository repository = new FileMemberRepository();를 사용한다.   
   
이 방법을 사용하면 Member 클래스의 필드에 정의된 타입을 무시하고 모두 String으로 저장해서 타입 캐스팅을 해야하는 문제와 구분자(DELIMITER)를 사용하는 문제가 있다.    

## 4-4. 회원 관리 예제3 - DataStream

DataInputStream, DataOutputStream을 사용하면 자바의 데이터 타입을 그대로 사용할 수 있고 구분자를 사용하지 않아도 된다.   

```java
public class DataMemberRepository implements MemberRepository {

    private static final String FILE_PATH = "temp/members-data.dat";

    @Override
    public void add(Member member) {
        try (DataOutputStream dos = new DataOutputStream(new FileOutputStream(FILE_PATH, true))) {
            dos.writeUTF(member.getId());
            dos.writeUTF(member.getName());
            dos.writeInt(member.getAge());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public List<Member> findAll() {
        List<Member> members = new ArrayList<>();
        try (DataInputStream dis = new DataInputStream(new FileInputStream(FILE_PATH))) {
            while (dis.available() > 0) {
                members.add(new Member(dis.readUTF(), dis.readUTF(), dis.readInt()));
            }
            return members;
        } catch (FileNotFoundException e) {
            return new ArrayList<>();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
```

실행을 위한 main 함수에 private static final MemberRepository repository = new DataMemberRepository();를 사용한다.    

#### DataStream 원리

readUTF()로 문자를 읽어올 때 id1이라는 3글자만 정확하게 읽어 올 수 있는 이유는   
writeUTF()로 문자를 저장할 때 2byte를 추가로 사용해서 앞에 글자의 길이를 저장해두기 때문이다.   
2byte 이므로 65535 길이 까지만 사용 가능하다.   
   
그리고 Int와 같은 기타 타입은 정해진 사이즈를 사용하기 때문에    
4byte를 사용해서 파일에 저장하고 읽을 때도 4byte를 읽어서 복원한다.   

따라서 DataOutputStream에서 쓴 순서대로 DataInputStream에서 읽으면 구분자 없이 데이터를 처리할 수 있다.   

#### 문제

DataStream을 사용하면 회원의 필드 하나하나를 다 조회해서 각 타입에 맞도록 따로따로 저장해야 하는 문제가 있다.   
단순하게 회원 객체를 그대로 자바 컬렉션에 보관 하도록 개선이 필요하다.   

## 4-5. 회원 관리 예제4 - ObjectStream
메모리에 저장되어 있는 회원 인스턴스를 읽어서 파일에 그대로 저장하면 간단하게 회원 인스턴스를 젖아할 수 있다.    
ObjectStream을 사용하면 메모리에 보관되어 있는 회원 인스턴스를 파일에 편리하게 저장할 수 있다.   

#### 객체 직렬화
객체 직렬화는 메모리에 있는 객체 인스턴스를 바이트 스트림으로 변환해 파일에 젖아하거나 네트워크를 통해 전송할 수 있도록 하는 기능이다.   
이 과정에서 객체의 상태를 유지해 나중에 역직렬화(Deserialization)를 통해 원래의 객체로 복원할 수 있다.   
객체의 직렬화를 사용하려면 지결로하 하려는 클래스는 Serializable 인터페이스를 구현해야 한다.   

Serializable 인터페이스는 아무 기능이 없고 직렬화 가능한 클래스라는 것을 표시하기 위한 마커 인터페이스 이다.   

```java
import java.io.Serializable;
    public class Member implements Serializable {
        private String id;
        private String name;
        private Integer age;
    ... 
}
```

```java
public class ObjectMemberRepository implements MemberRepository {

    private static final String FILE_PATH = "temp/members-obj.dat";

    @Override
    public void add(Member member) {
        List<Member> members = findAll();
        members.add(member);

        try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(FILE_PATH))) {
            oos.writeObject(members);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public List<Member> findAll() {
        try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream(FILE_PATH))) {
            return (List<Member>) ois.readObject();
        } catch (FileNotFoundException e) {
            return new ArrayList<>();
        } catch (IOException | ClassNotFoundException e) {
            throw new RuntimeException(e);
        }
    }
}
```

실행을 위한 main 함수에 private static final MemberRepository repository = new ObjectMemberRepository();를 사용한다.    

#### 직렬화/역직렬화

객체 직렬화를 사용하면 객체를 바이트로 변환해 파일, 네트워크 등 모든 종류의 스트림에 전달할 수 있다.    
그러나 클래스 구조가 변경되면 이전에 직렬화된 객체와의 호환성 문제가 발생해 버전 관리가 어렵다.   
그리고 자바 플랫폼에 종속적이어서 다른 언어나 시스템과 상호 운용성이 떨어진다.    
직렬화된 데이터의 크기가 크고 직렬화/역직렬화 과정이 상대적으로 느리고 리소스를 많이 사용해 성능 이슈도 있다.   
   
따라서 직렬화/역직렬화의 대안으로 XML, JSON를 사용하고 있다.   
XML은 복잡하고 무거운 단점이 있어 지금은 웹 환경에서 데이터를 교환할 때 JSON이 사실상 표준 기술이다.   
   
객체 직렬화의 대안으로 더 적응 용량과 성능을 제공하는 Protobuf나 Avro을 사용하는 경우도 있다.   

#### 데이터베이스

데이터를 구조화 하는 것을 고민 했다면, 구조화된 데이터를 보관하는 방법도 고민이 필요하다.   
데이터를 파일에 저장하는 것은 데이터의 무결성, 데이터 검색과 보안, 백업과 복구와 같은 큰 한계가 있다.   
이런 문제점들을 해결한 서버 프로그램이 데이터베이스이다.   