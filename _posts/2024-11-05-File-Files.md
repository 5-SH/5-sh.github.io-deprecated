---
layout: post
title: Java File, Files
date: 2024-11-05 10:00:00 + 0900
categories: [java]
tags: [file, files]
---

### 강의 : [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-2/dashboard)

# 5. File, Files

자바에서 파일 또는 디렉토리를 다룰 때는 File, Files, Path 클래스를 사용한다.   
자바 1.0에서 File 클래스가 등장하고 자바 1.7에서 File 클래스를 대체할 Files와 Path가 등장했다.   
Files는 성능과 편의성이 모두 개선되었고 File 클래스와 File 과 관련된 스트림을 활용하는 많은 유틸리티 기능이 있다.   

## 5-1. File 클래스 활용

```java
public class OldFileMain {

    public static void main(String[] args) throws IOException {
        File file = new File("temp/example.txt");
        File directory = new File("temp/exampleDir");

        // 1. exists(): 파일이나 디렉토리의 존재 여부를 확인
        System.out.println("File exists: " + file.exists());

        // 2. createNewFile(): 새 파일을 생성
        boolean created = file.createNewFile();
        System.out.println("File created: " + created);

        // 3. mkdir(): 새 디렉토리를 생성
        boolean dirCreated = directory.mkdir();
        System.out.println("Directory created: " + dirCreated);

        // 4. delete(): 파일이나 디렉토리를 삭제
        // boolean deleted = file.delete();
        // System.out.println("File deleted: " + deleted);

        // 5. isFile(): 파일인지 확인
        System.out.println("Is file: " + file.isFile());

        // 6. isDirectory(): 디렉토리인지 확인
        System.out.println("Is directory: " + directory.isDirectory());

        // 7. getName(): 파일이나 디렉토리의 이름을 반환
        System.out.println("File name: " + file.getName());

        // 8. length(): 파일의 크기를 바이트 단위로 반환
        System.out.println("File size: " + file.length() + " bytes");

        // 9. renameTo(File dest): 파일의 이름을 변경하거나 이동
        File newFile = new File("temp/newExample.txt");
        boolean renamed = file.renameTo(newFile);
        System.out.println("File renamed: " + renamed);

        // 10. lastModified(): 마지막으로 수정된 시간을 반환
        long lastModified = newFile.lastModified();
        System.out.println("Last modified: " + new Date(lastModified));
    }
}
```

## 5-2. Files 클래스 활용

```java
public class NewFilesMain {

    public static void main(String[] args) throws IOException {
        Path file = Path.of("temp/example.txt");
        Path directory = Path.of("temp/exampleDir");
        // 1. exists(): 파일이나 디렉토리의 존재 여부를 확인
        System.out.println("File exists: " + Files.exists(file));

        // 2. createFile(): 새 파일을 생성
        try {
            Files.createFile(file);
            System.out.println("File created");
        } catch (FileAlreadyExistsException e) {
            System.out.println(file + " File already exists");
        }

        // 3. createDirectory(): 새 디렉토리를 생성
        try {
            Files.createDirectory(directory);
            System.out.println("Directory created");
        } catch (
                FileAlreadyExistsException e) {
            System.out.println(directory + " Directory already exists");
        }

        // 4. delete(): 파일이나 디렉토리를 삭제
        // Files.delete(file);
        // System.out.println("File deleted");

        // 5. isRegularFile(): 일반 파일인지 확인
        System.out.println("Is regular file: " + Files.isRegularFile(file));

        // 6. isDirectory(): 디렉토리인지 확인
        System.out.println("Is directory: " + Files.isDirectory(directory));

        // 7. getFileName(): 파일이나 디렉토리의 이름을 반환
        System.out.println("File name: " + file.getFileName());

        // 8. size(): 파일의 크기를 바이트 단위로 반환
        System.out.println("File size: " + Files.size(file) + " bytes");

        // 9. move(): 파일의 이름을 변경하거나 이동
        Path newFile = Paths.get("temp/newExample.txt");
        Files.move(file, newFile, StandardCopyOption.REPLACE_EXISTING);
        System.out.println("File moved/renamed");

        // 10. getLastModifiedTime(): 마지막으로 수정된 시간을 반환
        System.out.println("Last modified: " + Files.getLastModifiedTime(newFile));

        // 추가: readAttributes(): 파일의 기본 속성들을 한 번에 읽기
        BasicFileAttributes attrs = Files.readAttributes(newFile, BasicFileAttributes.class);
        System.out.println("===== Attributes =====");
        System.out.println("Creation time: " + attrs.creationTime());
        System.out.println("Is directory: " + attrs.isDirectory());
        System.out.println("Is regular file: " + attrs.isRegularFile());
        System.out.println("Is symbolic link: " + attrs.isSymbolicLink());
        System.out.println("Size: " + attrs.size());
    }
}
```

## 5-3. 경로 표시

경로는 절대 경로와 정규 경로로 나눌 수 있다.   
절대 경로는 경로의 처음부터 내가 입력한 모든 경로를 다 표현한다.   
정규 경로는 경로의 계산이 모두 끝난 경로로서 정규 경로는 하나만 존재한다.   

```java
public class OldFilePath {

    public static void main(String[] args) throws IOException {
        File file = new File("temp/..");

        System.out.println("path = " + file.getPath());
        // 절대 경로
        System.out.println("Absolute path = " + file.getAbsolutePath());
        // 정규 경로
        System.out.println("Canonical path = " + file.getCanonicalPath());

        File[] files = file.listFiles();
        for (File f : files) {
            System.out.println((f.isFile() ? "F" : "D") + " | " + f.getName());
        }
    }
}
```

```java
public class NewFilesPath {

    public static void main(String[] args) throws IOException {
        Path path = Path.of("temp/..");
        System.out.println("path = " + path);

        // 절대 경로
        System.out.println("Absolute path = " + path.toAbsolutePath());

        // 정규 경로
        System.out.println("Canonical path = " + path.toRealPath());

        Stream<Path> pathStream = Files.list(path);
        List<Path> list = pathStream.toList();
        pathStream.close();
        for (Path p : list) {
            System.out.println((Files.isRegularFile(p) ? "F" : "D") + " | " + p.getFileName());
        }
    }
}
```

## 5-4. Files로 문자 파일 읽기

Files를 사용하면 FileReader, FileWriter, BufferedReader 같은 복잡한 스트림 클래스를 사용할 필요 없이 간단하게 파일을 읽을 수 있다.   

```java
public class ReadTextFileV1 {

    private static final String PATH = "temp/hello2.txt";

    public static void main(String[] args) throws IOException {
        String writeString = "abc\n가나다";
        System.out.println("== Write String ==");
        System.out.println(writeString);

        Path path = Path.of(PATH);

        // 파일에 쓰기
        Files.writeString(path, writeString, UTF_8);
        // 파일에서 읽기
        String readString = Files.readString(path, UTF_8);

        System.out.println("== Read String ==");
        System.out.println(readString);
    }
}
```

#### Files - 라인 단위로 읽기

```java
public class ReadTextFileV2 {

    public static final String PATH = "temp/hello2.txt";

    public static void main(String[] args) throws IOException {
        String writeString = "abc\n가나다";
        System.out.println("== Write String ==");
        System.out.println(writeString);

        Path path = Path.of(PATH);

        // 파일에 쓰기
        Files.writeString(path, writeString, UTF_8);
        // 파일에서 읽기
        String readString = Files.readString(path, UTF_8);

        System.out.println("== Read String ==");
        List<String> lines = Files.readAllLines(path, UTF_8);
        for (int i = 0; i < lines.size(); i++) {
            System.out.println((i + 1) + ": " + lines.get(i));
        }
    }
}
```

Files.readAllLines(path)는 파일을 한 번에 다 읽고, 라인 단위로 List에 나누어 저장하고 반환한다.    
파일을 한 줄 단위로 나누어 읽고 메모리 사용량을 줄이고 싶다면 Files.lines(path)를 사용하면 된다.    

```java
try(Stream<String> lineStream = Files.lines(path, UTF_8)) {
    lineStream.forEach(line -> System.out.println(line));
}
```

파일의 크기가 1000MB 일 때 Files.readAllLines(path)를 사용하면 1000MB 파일이 메모리에 불러진다.    
Files.lines(path)를 사용하고 파일의 한 줄에 1MB 크기라고 가정하면 파일에서 한 번에 1MB 만큼만 메모리에 올려서 처리한다.   
그리고 처리가 끝나면 다음 줄을 호출하고 기존에 사용한 1MB는 GC한다.   

## 5-5. 파일 복사 최적화

#### 예제 파일 생성

```java
public class CreateCopyFile {
    private static final int FILE_SIZE = 200 * 1024 * 1024; // 200MB

    public static void main(String[] args) throws IOException {
        String fileName = "temp/copy.dat";
        long startTime = System.currentTimeMillis();

        FileOutputStream fos = new FileOutputStream(fileName);
        byte[] buffer = new byte[FILE_SIZE];
        fos.write(buffer);
        fos.close();

        long endTime = System.currentTimeMillis();
        System.out.println("File created: " + fileName);
        System.out.println("File size: " + FILE_SIZE / 1024 / 1024 + "MB");
        System.out.println("Time taken: " + (endTime - startTime) + "ms");
    }
}
```

#### 파일 복사 예제 1

FileInputStream에서 readAllBytes를 통해 한 번에 모든 데이터를 읽고 write(bytes)를 통해 한 번에 모든 데이터를 저장한다.   

```java
public class FileCopyMainV1 {

    public static void main(String[] args) throws IOException {
        long startTime = System.currentTimeMillis();
        FileInputStream fis = new FileInputStream("temp/copy.dat");
        FileOutputStream fos = new FileOutputStream("temp/copy_new.dat");

        byte[] bytes = fis.readAllBytes();
        fos.write(bytes);
        fis.close();
        fos.close();
        long endTime = System.currentTimeMillis();
        System.out.println("Time taken: " + (endTime - startTime) + "ms");
    }
}

// 95ms 소요
```

#### 파일 복사 예제 2

InputStream에서 제공하는 transferTo() 메서드를 사용한다.    
transferTo() 메서드는 InputStream에서 읽은 데이터를 바로 OutputStream으로 출력한다.   
성능 최적화가 되어 있기 때문에 앞의 예제보다 조금 더 빠르다.

```java
public class FileCopyMainV2 {

    public static void main(String[] args) throws IOException {
        long startTime = System.currentTimeMillis();
        FileInputStream fis = new FileInputStream("temp/copy.dat");
        FileOutputStream fos = new FileOutputStream("temp/copy_new.dat");

        fis.transferTo(fos);
        fis.close();
        fos.close();
        long endTime = System.currentTimeMillis();
        System.out.println("Time taken: " + (endTime - startTime) + "ms");
    }
}

// 50ms 소요
```

#### 파일 복사 예제 3

앞의 예제들은 복사할 때 "파일 → 자바 → 파일" 과정을 거치지만 
Files.copy()는 자바에 파일을 불러오지 않고 운영체제의 파일 복사 기능을 사용해 "파일 → 파일" 과정으로 복사한다.   

```java
public class FileCopyMainV3 {

    public static void main(String[] args) throws IOException {
        long startTime = System.currentTimeMillis();
        Path source = Path.of("temp/copy.dat");
        Path target = Path.of("temp/copy_new.dat");
        Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);

        long endTime = System.currentTimeMillis();
        System.out.println("Time taken: " + (endTime - startTime) + "ms");
    }
}

// 34ms 소요
```