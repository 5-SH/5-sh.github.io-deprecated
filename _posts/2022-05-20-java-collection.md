---
layout: post
title: 자바 컬렉션 종류와 특징
date: 2022-05-20 14:00:00 + 0900
categories: [java]
tags: [java, collection]
---

# 자바 컬렉션 종류와 특징

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/169449431-4d570e2f-ad09-4554-a839-d98457c7bb73.jpg" height="350" />
  <p style="font-style: italic; color: gray;">출처 - https://memostack.tistory.com/234</p>
</figure>

## 1. List
인덱스를 가지는 원소들의 집합. 중복 값을 가질 수 있다.

### 1-1. ArrayList 
데이터 개수에 따라 자동적으로 크기가 조절된다.     
ArrayList 가 커지면 공간을 확보하는 연산이 필요하기 때문에 삽입이 많으면 성능이 좋지 않다.   

```java
List<String> strList = new ArrayList<>();
strList.add("test1");
strList.add("test2");
strList.add("test3");
strList.add(1, "test1-1");
for (String elem : strList) {
  System.out.println(elem);
}

strList.remove(0);
strList.remove(strList.indexOf("test3"));
Iterator<String> iter1 = strList.iterator();
while(iter1.hasNext()) {
  System.out.println(iter1.next());
}

System.out.println(strList.contains("test3"));
System.out.println(strList.contains("test1-1"));

List<Content> contentList = new ArrayList<>();
contentList.add(new Content("AA"));
contentList.add(new Content("AAAA"));
contentList.add(new Content("A"));
contentList.add(new Content("AAA"));
for (Content c : contentList) {
  System.out.println(c.getContent());
}

Collections.sort(contentList);
for (Content c : contentList) {
  System.out.println(c.getContent());
}
```

### 1-2. LinkedList 
ArrayList 에서 데이터 삽입, 삭제가 자주 일어나면 원소들의 위치를 옮기는 작업이 필요하다.    
LinkedList 는 링크로 연결되어 있어 삽입, 삭제 연산이 필요없다.     
LinkedList 는 삽입에 큰 비용이 들지 않지만 데이터 접근을 위해 단방향 조회해야 하므로    
인덱스 접근이 많은 경우 좋지 않다.
List 에 push 하고 index 로 접근하면 ArrayList, 리스트 중간에 추가 삭제가 빈번하면 LinkedList 가 더 좋다.

```java
List<String> strLinkedList = new LinkedList<>();
strLinkedList.add("hi1");
strLinkedList.add("hi2");
strLinkedList.add("hi3");
strLinkedList.add("hi4");
Iterator iter2 = strLinkedList.iterator();
while(iter2.hasNext()) {
  System.out.println(iter2.next());
}
System.out.println(strLinkedList.contains("hi5"));
System.out.println(strLinkedList.contains("hi1"));

strLinkedList.add(1, "hi1-1");
strLinkedList.remove(2);
for (String elem : strLinkedList) {
  System.out.println(elem);
}
```

### 1-3. Vector 
ArrayList 와 비슷하지만 동기화를 제공하기 때문에 멀티스레드에서 안전하게 데이터를 추가 & 삭제 할 수 있다.   
대신 동기화 때문에 ArrayList 보다 느리다.   

```java
List<String> strVector = new Vector<>();
strVector.add("hello1");
strVector.add("hello2");
strVector.add("hello3");
strVector.add("hello4");
strVector.add("hello5");

Iterator iter3 = strVector.iterator();
while(iter3.hasNext()) {
  System.out.println(iter3.next());
}

strVector.remove(4);
System.out.println(strVector.contains("hello5"));
for (String elem : strVector) {
  System.out.println(elem);
}
```

### 1-4. Stack
선입 후출 구조로 DFS 와 재귀적 호출에 자주 쓰인다.   

```java
Stack<String> strStack = new Stack<>();
strStack.push("hi1");
strStack.push("hi2");
strStack.push("hi3");
strStack.push("hi4");
strStack.push("hi5");

System.out.println(strStack.peek());
System.out.println(strStack.pop());
System.out.println(strStack.pop());
System.out.println(strStack.contains("hi3"));
System.out.println(strStack.contains("hi4"));
```

## 2. Queue
선입선출 구조로 front 는 dequeue, rear 는 enqueue 연산만 수행한다. BFS 에 주로 사용한다.   

```java
Queue<String> strQueue = new LinkedList<>();
strQueue.offer("t1");
strQueue.offer("t2");
strQueue.add("t3");
strQueue.add("t4");
strQueue.add("t5");

System.out.println(strQueue.peek());
System.out.println(strQueue.peek());
System.out.println(strQueue.poll());
System.out.println(strQueue.poll());
System.out.println(strQueue.peek());
```

### 2-1. PriorityQueue
큐에서 높은 우선 순위의 요소를 먼저 꺼내어 처리한다.    
우선 순위 기준으로 최소, 최대 힙을 구현해 사용한다.   
PriorityQueue<T> pq1 = new PriorityQueue<T>(); → 우선 순위가 낮은 숫자 순   
PriorityQueue<T> pq2 = new PriorityQueue<T>(Collections.reverseOrder()); → 우선 순위가 높은 숫자 순   

커스텀 객체를 PriorityQueue 로 사용하려면 Comparable interface 를 implement 하는 class 를 생성한 후     
compareTo method 를 우서눈위에 맞게 구현해 준다.

```java
class Content implements Comparable<Content> {
  private String content;

  public Content(String content) {
    this.content = content;
  }

  public String getContent() {
    return content;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    Content c = (Content) o;
    return this.getContent().toLowerCase().equals(c.getContent().toLowerCase());
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(this.getContent().toLowerCase());
  }

  @Override
  public int compareTo(Content o) {
    if (this.content.length() > o.getContent().length()) return -1;
    else if (this.content.length() < o.getContent().length()) return 1;
    return 0;
  }
}

PriorityQueue<Integer> strPriorityQueue = new PriorityQueue<>();
strPriorityQueue.add(1);
strPriorityQueue.add(5);
strPriorityQueue.add(3);
strPriorityQueue.add(4);
strPriorityQueue.add(2);

int strPriorityQueueSize = strPriorityQueue.size();
for (int i = 0; i < strPriorityQueueSize; i++) {
  System.out.println(strPriorityQueue.poll());
}

PriorityQueue<Content> contentPriorityQueue = new PriorityQueue<Content>();
contentPriorityQueue.offer(new Content("a"));
contentPriorityQueue.offer(new Content("aaaa"));
contentPriorityQueue.offer(new Content("aaa"));
contentPriorityQueue.offer(new Content("aa"));
contentPriorityQueue.offer(new Content("aaaaa"));

int contentPriorityQueueSize = contentPriorityQueue.size();
for (int i = 0; i < contentPriorityQueueSize; i++) {
  System.out.println(contentPriorityQueue.poll().getContent());
}
```

## 3. Set
데이터를 중복해서 저장할 수 없으며 입력된 순서를 보장하지 않는다.    
LinkedHashSet 은 입력한 순서대로 저장한다.   

### 3-1. HashSet 
해쉬 값으로 데이터를 특정 위치에 저장해 데이터를 빠르게 찾을 수 있도록 만든 것.   
인덱스가 없고 추가, 삭제 시 값이 있는지 검색하고 넣기 때문에 List 보다 느리다.    
객체를 저장하기 전에 hashCode() 메소드를 호출해서 코드를 얻어낸 다음 같은 코드가 있는지 확인한다.   
있으면 equals() 메소드로 확인해서 true 이면 저장하지 않는다.    
index 로 값을 가져오는 get method 는 없다. iterator 로 값을 가져와야 한다.

```java
Set<String> strSet = new HashSet<>();
strSet.add("Str1");
strSet.add("Str1");
strSet.add("Str2");
strSet.add("Str3");

for (String elem : strSet) {
  System.out.println(elem);
}
System.out.println(strSet.contains("Str1"));
System.out.println(strSet.contains("Str4"));
System.out.println("-----------------------------------------------------");

Set<Content> contentHashSet = new HashSet<>();
contentHashSet.add(new Content("itsa"));
contentHashSet.add(new Content("itsA"));

for (Content content : contentHashSet) {
  System.out.println(content.getContent());
}
```

### 3-2. LinkedHashSet
HashSet 은 순서를 관리하지 않아 출력할 때 마다 순서가 다르게 나올 수 있다.   
LnkedHashSet 은 삽입된 순서로 출력한다.   

```java
Set<String> strLinkedHashSet = new LinkedHashSet<>();
strLinkedHashSet.add("Str1");
strLinkedHashSet.add("Str1");
strLinkedHashSet.add("Str3");
strLinkedHashSet.add("Str2");
for (String elem : strLinkedHashSet) {
  System.out.println(elem);
}
```

## 4. Map
key, value 로 값을 저장한다.    
HashMap 은 동기화를 보장하지 않고 HashTable 은 동기화를 보장한다.

### 4-1. HashMap

```java
Map<String, String> strHashMap = new HashMap<>();
strHashMap.put("a", "it's a");
strHashMap.put("b", "it's b");
strHashMap.put("c", "it's c");
strHashMap.put("d", "it's d");
strHashMap.put("e", "it's e");

Set<String> strHashMapKeys = strHashMap.keySet();
for (String keys : strHashMapKeys) {
  System.out.println(keys);
}
for (String keys : strHashMapKeys) {
  System.out.println(strHashMap.get(keys));
}
Collection<String> strHashMapValues = strHashMap.values();
Iterator iter5 = strHashMapValues.iterator();
System.out.println();
while(iter5.hasNext()) {
  System.out.println(iter5.next());
}
System.out.println();
for (String value : strHashMapValues) {
  System.out.println(value);
}

Map<Content, String> contentKeyHashMap = new HashMap<>();
contentKeyHashMap.put(new Content("A"), "a");
contentKeyHashMap.put(new Content("a"), "a");

Set<Content> contentKeyHashMapKeys = contentKeyHashMap.keySet();
for (Content key : contentKeyHashMapKeys) {
  System.out.println(contentKeyHashMap.get(key));
}
System.out.println(contentKeyHashMap.containsKey(new Content("A")));
```

### 4-2. TreeMap

SortedMap 을 구현한다.

```java
SortedMap<Integer, Content> contentTreeMap = new TreeMap<Integer, Content>(Collections.reverseOrder());
contentTreeMap.put(2, new Content("AA"));
contentTreeMap.put(4, new Content("AAAA"));
contentTreeMap.put(1, new Content("A"));
contentTreeMap.put(5, new Content("AAAAA"));
contentTreeMap.put(3, new Content("AAA"));

Set<Integer> contentTreeMapKeys = contentTreeMap.keySet();
for (Integer key : contentTreeMapKeys) {
  System.out.println(contentTreeMap.get(key).getContent());
}


int[] A = {1, 2, 3, 4, 5};
List<Integer> linkedList = new LinkedList<Integer>();
Integer[] result = linkedList.toArray(new Integer[linkedList.size()]);

```