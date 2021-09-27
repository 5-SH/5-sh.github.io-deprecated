---
layout: post
title: 자바 컬렉션 종류와 특징
date: 2021-09-27 23:00:00 + 0900
categories: Java
ref: Java, collection
---

# 자바 컬렉션 종류와 특징

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/134942953-4ee17bf3-15fd-40b1-83f1-db30172e509e.png" />
  <figcaption></figcaption>
</figure>

[자바 컬렉션 코드 예제](https://github.com/5-SH/Algorithm/blob/master/java/src/Collections/Main.java)

## 1. List
인덱스를 가지는 원소들의 집합. 중복 값을 가질 수 있다.

- ArrayList : 데이터 개수에 따라 자동적으로 크기가 조절된다. 배열 대신 자주 사용한다.
- LinkedList : ArrayList 에서 데이터 삽입, 삭제가 자주 일어나면 원소들의 위치를 옮기는 작업이 필요하다.   
LinkedList 는 링크로 연결되어 있어 삽입, 삭제 연산이 필요없다.   
리스트에 push 하고 index 로 접근하면 ArrayList, 리스트 중간에 추가, 삭제가 자주 일어나면 LinkedList 가 좋다.
- Vector : ArrayList 와 비슷하지만 동기화를 제공하기 때문에 멀티스레드에서 안저하게 데이터를 추가, 삭제할 수 있다.   
대신 동기화 때문에 ArrayList 보다 느리다.
- Stack : 선입후출 구조로 DFS 와 재귀호출에 자주 쓰인다.

## 2. Queue
선입후출 구조로 front 는 dequeue, rear 는 enqueue 연산만 수행한다. BFS 에 주로 사용한다.

- PriorityQueue : 큐에서 높은 우선순위의 요소를 먼저 꺼내 처리한다.   
우선순위 기주능로 최소, 최대 힙을 구현해 사용한다.   
커스템 객체를 PriorityQueue 로 사용하려면 Comparable interface 를 implement 하는 class 를 생성한 후 comareTo method 를 우선순위에 맞게 구현한다.

## 3. Set
데이터를 중복해서 저장할 수 없고 입력 순서대로 저장한다.   
보통 순서를 보자하지 않는다. (LinkedHashSet 은 순서를 보장한다.)

- HashSet : hash 로 데이터의 특정 위치를 고정시켜 데이터를 빠르게 찾을 수 있도록 만들었다.   
인덱스가 없고 추가, 삭제 시 값이 있는지 검색하고 넣기 때문에 List 보다 느리다.   
객체를 저장하기 전에 hashCode() 를 호출해 코드를 얻고 같은 코드가 있는지 확인한다.   
있으면 equals 로 확인해서 true 이면 저장하지 않는다.   
인덱스로 값을 가져오는 get method 가 없다. iterator 로 값을 가져와야 한다.   
- LinkedHashSet : HasSet 은 원소들을 순서대로 관리하지 않아 출력할 때 마다 순서가 다르게 나올 수 있다.   
LinkedHashset 은 삽입된 순서로 출력을 보장한다.

## 4. Map   
key, value 로 값을 저장한다.

- HashMap 은 동기화를 보장하지 않고 HashTable 은 동기화를 보장한다.
- SortedMap : key 순서를 보장하는 Map