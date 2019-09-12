importPackage(java.lang);
importPackage(java.io);

/* ----------------------------- 경로 건들지 마세요 ----------------------------- */

const sdcard = android.os.Environment.getExternalStorageDirectory().getAbsolutePath();

const BOT_FOLDER_PATH = new File(sdcard + "/Bot");
const WCD_FOLDER_PATH = new File(BOT_FOLDER_PATH + "/WordChainData");
const GAMEDATA_FILE_PATH = new File(WCD_FOLDER_PATH + "/GameData.gdf");
const ALLWORDLIST_FILE_PATH = new File(WCD_FOLDER_PATH + "/AllWordList.wcf");
const STARTWORDLIST_FILE_PATH = new File(WCD_FOLDER_PATH + "/StartWordList.wcf"); 
const SETTING_FILE_PATH = new File(WCD_FOLDER_PATH + "/WordChain.setting");

/* ---------------------------------------------------------------------------- */

let gamePlayerData = [],	// 참가한 플레이어 목록
	gamePlayerList = [],	// 현재 플레이어 목록
	gamePlayerLife = [],	// 플레이어 라이프

	gameStartTime = 0,
	gamePlayTime = 0,

	gameUsedWord = [],		// 사용된 단어
	gameLastChar = "",		// 매칭 확인용 글자 (사[과] -> 과자)
	gamePower = false,		// 게임 전원
	gameFirst = true,		// 처음 확인
	gameStop = true,		// 게임 일시정지
	gameTurn = 1,			// 게임 턴
	
	modeOwnCom = true,		// 한방단어 모드

	gameTimerCount = 0,		// 타이머 카운트
	gameTimerStop = false,	// 타이머 일시정지
	gameTimerPower = false,	// 타이머 전원

	roomName = "",			// 방 이름
	roomCreat = false,		// 방 생성 여부
	roomTimerCount = 0,		// 방 타이머 카운트
	roomTimerPower = false, // 방 타이머 전원

	/*
		BOT LELVEL
		----------
		1 : easy
		2 : normal
		3 : hard
		----------
	*/

	aiLevel = 0,		// AI 난이도
	aiName = "AI:",		// AI 이름
	aiCreat = false,	// AI 생성 여부
	aiPower = false;	// AI 전원
	
/* ---------------------------------------------------------------------------- */

const Bot = {};

const WordFile = 
{
	check : function()
	{
		if (!(BOT_FOLDER_PATH.exists()))
		{
			Bot.reply("NOT Bot Folder : (sdcard/Bot/)");
			return false;
		}
		else if (!(WCD_FOLDER_PATH.exists()))
		{
			Bot.reply("NOT WordChainData Folder : (sdcard/Bot/WordChainData/)");
			return false;
		}
		else if (!(GAMEDATA_FILE_PATH.exists()))
		{
			Bot.reply("NOT GameData File : (sdcard/Bot/WordChainData/GameData.gdf)");
			return false;
		}
		else if (!(ALLWORDLIST_FILE_PATH.exists()))
		{
			Bot.reply("NOT AllWordList File : (sdcard/Bot/WordChainData/AllWordList.wcf)");
			return false;
		}
		else if (!(STARTWORDLIST_FILE_PATH.exists()))
		{
			Bot.reply("NOT StartWordList File : (sdcard/Bot/WordChainData/StartWordList.wcf)");
			return false;
		}
		else if (!(SETTING_FILE_PATH.exists()))
		{
			Bot.reply("NOT Setting File : (sdcard/Bot/WordChainData/WordChain.setting)");
			return false;
		}
		else return true;
	},

	save : function(file, content)
	{
	   let bufferedWriter = new java.io.BufferedWriter(new java.io.FileWriter(file, false));
	   bufferedWriter.write(new java.lang.String(content));
	   bufferedWriter.close();
	},

	append : function(file, content)
	{
	   let bufferedWriter = new java.io.BufferedWriter(new java.io.FileWriter(file, true));
	   bufferedWriter.write(new java.lang.String(content));
	   bufferedWriter.close();
	},

	// JSON Text
	saveGameData : function()
	{
		let list = Object.keys(DB.GameData), text = "", 
			len = list.length, i, data = [];

		if (!list.length) { return ; }

		for (i = 0 ; i < len ; i ++)
		{
			data[i] = "\"" + list[i] + "\":{\"Name\":\"" + DB.GameData[list[i]].Name + "\",\"Num\":\"" + DB.GameData[list[i]].Num + "\"}";
		}

		text = "{" + data.join(",") + "}";

		WordFile.save(GAMEDATA_FILE_PATH, text);
	},

	read : function(file)
	{
		let bufferedReader = new BufferedReader(new FileReader(file)),
			fileReadLine = "", fileContent = "";

		while ((fileReadLine = bufferedReader.readLine()) != null)
		{
			fileContent	+= fileReadLine;
		}

		bufferedReader.close();

		return fileContent;
	},

	readSettingData : function()
	{
		return WordFile.read(SETTING_FILE_PATH).replace(/[ \n]/g, "").split(";");
	},
};

let settingData = WordFile.readSettingData();

const GAME_TIMER_OUT   = Number(settingData[0].split("GAME_TIMER_OUT=")[1]);
const GAME_WORD_FILTER = settingData[1].split("GAME_WORD_FILTER=")[1];
const ROOM_TIMER_OUT   = Number(settingData[2].split("ROOM_TIMER_OUT=")[1]);
const BOT_DELAY_TIME   = Number(settingData[3].split("BOT_DELAY_TIME=")[1]);

const DB = 
{
	GameData : [],  // Game Data
	AllWord : [],   // Word Data
	StartWord : [], // AI or Dictionary Data

	load : function()
	{
		DB.loadGameData();
		DB.loadWordData();
	},

	loadGameData : function()
	{
		try { DB.GameData = JSON.parse(WordFile.read(GAMEDATA_FILE_PATH)); } catch(e) { }
	},

	loadWordData : function()
	{
		DB.AllWord  = JSON.parse(WordFile.read(ALLWORDLIST_FILE_PATH));
		DB.StartWord = JSON.parse(WordFile.read(STARTWORDLIST_FILE_PATH));
	},

	isLoaded : function()
	{
		return (Object.keys(DB.AllWord).length && Object.keys(DB.StartWord).length) ? true : false;
	},

	setGameData : function(word)
	{
		if (!DB.GameData[word])
		{
			DB.GameData[word] = 
			{
				'Name' : word,
				'Num' : 1,
			};
		}
		else
		{
			DB.GameData[word].Num = Number(DB.GameData[word].Num) + 1;
		}
	},

	getDoumChar : function(lastChar)
	{
		let data = lastChar.charCodeAt() - 0xAC00;
		if (data < 0 || data > 11171) return ;

		const RIEUL_TO_NIEUN = [4449, 4450, 4457, 4460, 4462, 4467];
		const RIEUL_TO_IEUNG = [4451, 4455, 4456, 4461, 4466, 4469];
		const NIEUN_TO_IEUNG = [4455, 4461, 4466, 4469];
	
		let	onset = Math.floor(data / 28 / 21) + 0x1100,
			nucleus = (Math.floor(data / 28) % 21) + 0x1161, 
			coda = (data % 28) + 0x11A7, isDoumChar = false, doumChar;
		
		if (onset == 4357)
		{
			isDoumChar = true;
			(RIEUL_TO_NIEUN.indexOf(nucleus) != -1) ? onset = 4354 : (RIEUL_TO_IEUNG.indexOf(nucleus) != -1) ? onset = 4363 : isDoumChar = false;
		}
		else if (onset == 4354)
		{
			if (NIEUN_TO_IEUNG.indexOf(nucleus) != -1)
			{
				onset = 4363;
				isDoumChar = true;
			}
		}
		if (isDoumChar)
		{
			onset -= 0x1100; nucleus -= 0x1161; coda -= 0x11A7;
			doumChar = String.fromCharCode(((onset * 21) + nucleus) * 28 + coda + 0xAC00);
		}

		return doumChar;
	},

	getWordMean : function(word) 
	{
		if (DB.isWord(word))
		{
			let mean = DB.AllWord[word][0];
			return (mean.length > 25) ? mean.substr(0, 25) + ".." : mean;
		}
		else return null;
	},

	getAllWordMean : function(word) 
	{ 
		if (DB.isWord(word))
		{
			let allWord = DB.AllWord[word], len = allWord.length, i, text = [], power = true;
			
			for (i = 0 ; i < len ; i ++)
			{
				text[i] = "「" + java.lang.String.format("%03d", Integer(i + 1)) + "」「명사」 " + allWord[i];
				if (power) { text[0] += "\u200b".repeat(500); power = false; }
			}

			return text.join("\n\n");
		}
		else return null;
	},

	getRandomWord : function()
   	{
		return Object.keys(DB.AllWord)[Math.floor(Math.random() * Object.keys(DB.AllWord).length)];
	},

	getStartWord : function(startChar) 
	{
		return DB.StartWord[startChar]; 
	},

	getFirstChar : function(word)
	{
		return word[0];
	},

	getLastChar : function(word) 
	{ 
		return word[word.length - 1]; 
	},

	getLastCharMessage : function(lastChar) 
	{ 
		return lastChar = (DB.getDoumChar(lastChar)) ? lastChar + "(" + DB.getDoumChar(lastChar) + ")" : lastChar; 
	},

	isWord : function(word)
	{
		return DB.AllWord[word] ? true : false;
	},

	isInGameData : function (word) 
	{ 
		return DB.GameData[word] ? true : false; 
	},

	isStartChar : function(startChar)
	{
		return DB.StartWord[startChar] ? true : false;
	},

	isUsedWord : function(word)
	{
		return (gameUsedWord.indexOf(word) != -1);
	},

	isOwnComWord : function(word)
	{
		if (DB.isStartChar(DB.getLastChar(word))) return false;
		else return (DB.isStartChar(DB.getDoumChar(DB.getLastChar(word)))) ? false : ((modeOwnCom) ? false : true);
	},

	checkWord : function(word, lastChar)
	{
		if (!word) 
		{ 
			Bot.replyRoom("단어를 입력 해 주세요.");
			return false; 
		}
		else if (word.length < 2)
		{
			Bot.replyRoom("두 글자 이상의 단어를 입력 해 주세요."); 
			return false; 
		}
		else if (GAME_WORD_FILTER.indexOf(word) != -1)
		{
			Bot.replyRoom(word + "(은)는 금칙어 입니다.");
			return false;
		}
		else if (DB.isUsedWord(word))
		{ 
			Bot.replyRoom("이미 사용한 단어 입니다."); 
			return false;
		}
		else
		{
			if (!DB.isWord(word))
			{	
				Bot.replyRoom("\"" + word + "\" (은)는 명사가 아니거나 사전에 등록되지 않은 단어입니다.");
				return false;
			}
			else if (DB.isOwnComWord(word))
			{
				Bot.replyRoom("현재 한방 단어가 금지된 상태입니다.");
				return false;
			}			
			else if (lastChar != DB.getFirstChar(word))
			{
				if (gameFirst) return true;
				else 
				{
					if (DB.getDoumChar(lastChar) == DB.getFirstChar(word)) return true;
					else
					{
						Bot.replyRoom(DB.getLastCharMessage(lastChar) + " (으)로 시작하는 단어를 입력 해 주세요."); 
						return false;
					}
				}
			}
			else return true;
		}
	},
};

const AI = 
{
	getWord : function(lastChar)
	{
		let startWordData = DB.StartWord[lastChar],
			startDoumWord = DB.StartWord[DB.getDoumChar(lastChar)];

		if (startWordData)
		{
			if (startDoumWord)
			{
				startWordData = (startWordData + "," + startDoumWord).split(",");
			}
		}
		else
		{
			if (startDoumWord)
			{
				startWordData = startDoumWord;
			}
			else return null;
		}

		let startWordList = [],			// @로 시작하는 단어 리스트
			startWordLastChar = [],		// @로 시작하는 단어의 끝 글자
			startWordDoumChar = null,   // @로 시작하는 단어의 끝 글자 (두음 적용)
			startWordStartWord = [],    // @로 시작하는 단어의 끝 글자로 시작하는 단어
			startWordStartWordNum = [], // @로 시작하는 단어의 끝 글자로 시작하는 단어의 갯수

			easyValue = 0, normalValue = 0, hardValue = 0,
			easyCount = 0, normalCount = 0, hardCount = 0,
			easyLevel = [], normalLevel = [], hardLevel = [],
			easyWord = null, normalWord = null, hardWord = null, replyWord = null,

			/*
				easyValue   = 51% ~ 100%
				normalValue = 21% ~ 50%
				hardValue   = 00% ~ 20%
			*/

			len = startWordData.length,
			maxValue = 0, count = 0, i;

		for (i = 0 ; i < len ; i ++)
		{
			startWordLastChar[i] = startWordData[i][startWordData[i].length - 1];
			
			if (gameUsedWord.indexOf(startWordData[i]) == -1 && (!DB.isOwnComWord(startWordData[i])))
			{
				startWordList[count ++] = startWordData[i];
			}
		}

		for (i = 0 ; i < count ; i ++)
		{
			startWordDoumChar = DB.getDoumChar(startWordLastChar[i]);
			startWordStartWord = DB.StartWord[startWordLastChar[i]];

			if (!startWordStartWord) { if (startWordDoumChar) startWordStartWord = DB.StartWord[startWordDoumChar]; }
			else { if (startWordDoumChar) startWordStartWord = (startWordStartWord + "," + DB.StartWord[startWordDoumChar]).split(","); }

			startWordStartWordNum[i] = 0;

			if (startWordStartWord)
			{
				startWordStartWordNum[i] = startWordStartWord.length;
				
				if (maxValue < startWordStartWordNum[i])
				{
					maxValue = startWordStartWordNum[i];
				}
			}
		}

		easyValue = maxValue * 0.5;
		hardValue = maxValue * 0.2;

		for (i = 0 ; i < len ; i ++)
		{
			if (easyValue < startWordStartWordNum[i])
			{
				easyLevel[easyCount ++] = startWordList[i];
			}
			else if (hardValue < startWordStartWordNum[i] && startWordStartWordNum[i] >= easyCount)
			{
				normalLevel[normalCount ++] = startWordList[i];
			}
			else
			{
				hardLevel[hardCount ++] = startWordList[i];
			}
		}

		let getWord = (array) => 
			{ 
				let data = [], len = array.length, 
					count = 0, temp = "", i, j;

				for (i = 0 ; i < len ; i ++)
				{
					if (Object.keys(DB.GameData).indexOf(array[i]) != -1)
					{
						data[count ++] = array[i];
					}
				}
				if (count == 1)
				{
					return data[0];
				}
				else if (count >= 2)
				{
					/*
					for (i = 0 ; i < count - 1 ; i ++)
					{
						for (j = i + 1 ; j < count ; j ++)
						{	
							if (DB.GameData[data[i]].Num < DB.GameData[data[j]].Num)
							{
								temp = data[j];
								data[j] = data[i];
								data[i] = temp;
							}
						}
					}*/

					return data[Math.floor(Math.random() * count)];
				}
				else
				{
					return array[Math.floor(Math.random() * len)];
				}
			};

		switch (aiLevel)
		{
			case 3 : 
				
				replyWord = (hardCount) ? getWord(hardLevel) : 
							(normalCount) ? getWord(normalLevel) :
							(easyCount) ? getWord(easyLevel) : null;
				break;

			case 2 :

				replyWord = (normalCount) ? getWord(normalLevel) :
							(easyCount) ? getWord(easyLevel) : null;
				break;

			case 1 :

				replyWord = (easyCount) ? getWord(easyLevel) : null;
				break;
		}

		return replyWord;
	},

	getReply : function(lastChar)
	{
		let aiWord = AI.getWord(lastChar);

		if (!aiWord)
		{
			Thread.sleep(BOT_DELAY_TIME * 1000);

			if (gamePlayerList.length == 2)
			{
				Bot.replyRoom
				(
					"[ " + aiName + " ] 가 입력 할 단어가 없어 아웃됩니다.\n" +
					"승자는 [ " + Game.getNextPlayerName() + " ] 님 입니다!"
				);

				Game.off();
			}
			else
			{
				Game.setPlayerDelete(aiName);

				Bot.replyRoom("[ " + aiName + " ] 가 입력 할 단어가 없어 아웃됩니다.");

				Bot.replyRoom
				(
					"[ " + Game.getNowPlayerName() + " ] 님은 새로운 단어를 입력해 주세요\n\n" + 
					"<남은 플레이어>\n" + Game.printPlayer()
				);
			}
		}
		else
		{
			lastChar = (gameLastChar = DB.getLastChar(aiWord));

			Thread.sleep(BOT_DELAY_TIME * 1000);

			Bot.replyRoom("[ " + aiName +" ] : " + aiWord);

			Bot.replyRoom
			(
				"<" + DB.getWordMean(aiWord) + ">\n\n" +
				"[ " + aiName + " ] 가 \"" + aiWord + "\"단어를 입력했습니다.\n" +
				"[ " + Game.getNextPlayerName() + " ] 님은 \"" + DB.getLastCharMessage(lastChar) + "\" (으)로 시작하는 단어를 입력해 주세요"
			);

			Game.setNextEvent(aiWord);
		}
	},

	getRandomReply : function()
	{
		let randomWord = "";

		while (true)
		{
			randomWord = DB.getRandomWord();

			if (DB.isOwnComWord(randomWord) || DB.isUsedWord(randomWord))
			{
				randomWord = DB.getRandomWord();
			}
			else 
			{
				AI.getReply(DB.getLastChar(randomWord));
				break;
			}
		}
	},

	isAITurn : function()
	{
		if (aiPower && (Game.getNowPlayerName() == aiName)) 
		{
			return true;
		}
	}
};

const Game = 
{
	startTimer : function()
	{
		new Thread 
		({ 
			run : function() { try 
			{
				while (gameTimerPower)
				{
					Thread.sleep(1000);
					
					if (gameTimerCount >= GAME_TIMER_OUT)
					{
						Game.setPlayerLife();
						gameTimerCount = 0;
					}
					else 
					{
						gameTimerCount ++;
						
						if (gameTimerCount == 5) 
						{
							Bot.replyRoom("10초 남았습니다."); 
						} 
					}
				}
			}
			catch(e) 
			{ 
				Bot.reply
				(
					"TIMER ERROR!\n\n" +
					"Error Code : " + e 
				);
			}
		}}).start();
	},

	printPlayer : function()
	{
		let list = ["첫", "두", "세", "네", "다섯", "여섯", "일곱", "여덟"], text = [], len = gamePlayerList.length, i;
		for (i = 0 ; i < len ; i ++)  { text[i] = list[i] + "번째 : " + gamePlayerList[i]; }

		return text.join("\n");
	},

	getPlayerPosition : function(player) 
	{ 
		return gamePlayerList.indexOf(player); 
	},

	getNowPlayerName : function()
	{
		 return gamePlayerList[gameTurn - 1]; 
	},

	getNowPlayerLife : function()
	{ 
		return gamePlayerLife[gameTurn - 1]; 
	},

	getNextPlayerName : function()
	{ 
		return gamePlayerList[(gameTurn == gamePlayerList.length) ? 0 : gameTurn]; 
	},

	setNextTurn : function() 
	{
		gameFirst = false;	
		gameTimerCount = 0;
		gameTurn = ((gameTurn == gamePlayerList.length) ? 1 : (gameTurn + 1)); 
	},

	setNextEvent : function(word)
	{
		gameUsedWord.push(word);						
		Game.setNextTurn();	
	},

	setPlayerAdd : function(player)
	{
		gamePlayerData.push(player);
		gamePlayerList.push(player); 
		gamePlayerLife.push(2);	
	},

	setPlayerDelete : function(player) 
	{
		if (gameTurn == gamePlayerList.length) { Game.setNextTurn(); }

		gamePlayerList.splice(Game.getPlayerPosition(player), 1);
		gamePlayerLife.splice(Game.getPlayerPosition(player), 1);

		gameFirst = true;
		gameTimerCount = 0;
	},

	setPlayerGiveUp : function(player)
	{
		let nowPlayerName = Game.getNowPlayerName(),
			nextPlayerName = Game.getNextPlayerName();

		if (gamePlayerList.length == 2)
		{
			Bot.replyRoom("승자는 [ " + nextPlayerName + " ] 님 입니다!");
			Game.off();
		}
		else
		{
			Game.setPlayerDelete(player);

			if (nowPlayerName == player)
			{
				Bot.replyRoom
				(
					"[ " + nextPlayerName + " ] 님은 새로운 단어를 입력해 주세요\n\n" + 
					"<남은 플레이어>\n" + Game.printPlayer()
				);

				AI.isAITurn() ? AI.getRandomReply() : null;
			}
			else
			{
				if ((gameTurn - 1) > Game.getPlayerPosition(player))
				{
					gameTurn -= 1;
				}

				Bot.replyRoom("<남은 플레이어>\n" + Game.printPlayer());
			}
		}
	},

	setPlayerExit : function(player)
	{
		let nowPlayerName = Game.getNowPlayerName(),
			nextPlayerName = Game.getNextPlayerName();

		if (gamePlayerList.length == 2)
		{
			Bot.replyRoom("승자는 [ " + nextPlayerName + " ] 님 입니다!");
			Game.off();
		}
		else
		{
			Game.setPlayerDelete(player);
			gamePlayerData.splice(Game.getPlayerPosition(player), 1);

			if (nowPlayerName == player)
			{
				Bot.replyRoom
				(
					"[ " + nextPlayerName + " ] 님은 새로운 단어를 입력해 주세요\n\n" + 
					"<남은 플레이어>\n" + Game.printPlayer()
				);

				AI.isAITurn() ? AI.getRandomReply() : null;
			}
			else
			{
				if ((gameTurn - 1) > Game.getPlayerPosition(player))
				{
					gameTurn -= 1;
				}

				Bot.replyRoom("<남은 플레이어>\n" + Game.printPlayer());
			}
		}
	},

	setPlayerLife : function()
	{
		gamePlayerLife[gameTurn - 1] -= 1;

		let nowPlayerName = Game.getNowPlayerName(),
			nowPlayerLife = Game.getNowPlayerLife(),
			nextPlayerName = Game.getNextPlayerName();
		
		if (nowPlayerLife > 0)
		{
			Bot.replyRoom
			(
				"<시간 초과>\n\n" + 
				"[ " + nowPlayerName + " ] 님의 라이프가 1 감소합니다.\n\n" + 
				"남은 라이프 : " + nowPlayerLife
			);
		}
		else
		{
			if (gamePlayerList.length == 2)
			{
				Bot.replyRoom
				(
					"<시간 초과>\n\n" + 
					"[ " + nowPlayerName + " ] 님이 라이프가 0이 되어 게임을 종료합니다.\n" +
					"승자는 [ " + nextPlayerName + " ] 님 입니다!"
				);
				Game.off();
			}
			else
			{
				Game.setPlayerDelete(nowPlayerName);

				Bot.replyRoom
				( 
					"<시간 초과>\n\n" + 
					"[ " + nowPlayerName + " ] 님이 라이프가 0이 되어 아웃되었습니다."
				);

				Bot.replyRoom
				(
					"[ " + nextPlayerName + " ] 님은 새로운 단어를 입력해 주세요\n\n" + 
					"<남은 플레이어>\n" + Game.printPlayer()
				);

				AI.isAITurn() ? AI.getRandomReply() : null;
			}
		}
	}, 

	main : function(room, sender, message)
	{   
		let input = message.substr(0, 2) == "::",
			command = message.charAt(0) == "/";

		(command) ? Game.command(room, sender, message) : "";

		if (gamePower && input)
		{
			let word = message.substring(2).trim(),
				len	 = gamePlayerList.length, num = 0;

			for (num = 0 ; num < len ; num ++) 
			{
				if ((sender == gamePlayerList[num]) && ((gameTurn - 1) == num)) 
				{
					if (DB.checkWord(word, gameLastChar))
					{
						DB.setGameData(word);

						let lastChar		= (gameLastChar = DB.getLastChar(word)),
							nowPlayerName 	= Game.getNowPlayerName(),
							nextPlayerName	= Game.getNextPlayerName();

						Bot.replyRoom
						(
							"<" + DB.getWordMean(word) + ">\n\n" +
							"[ " + nowPlayerName + " ] 님이 \"" + word + "\"단어를 입력하셨습니다.\n" +
							"[ " + nextPlayerName + " ] 님은 \"" + DB.getLastCharMessage(lastChar) + "\"(으)로 시작하는 단어를 입력해 주세요"
						);

						Game.setNextEvent(word);

						AI.isAITurn() ? AI.getReply(DB.getLastChar(word)) : null;
					}
				}
			}
		}
	},

	command : function(room, sender, message)
	{
		let command = message.split(" ")[0],
			input 	= message.split(" ")[1],
			select 	= message.split(" ")[2],
			type 	= message.split(" ")[3];
	
			roomManager  = gamePlayerList[0],
			roomCheck	 = (roomName == room),
			managerCheck = (roomManager == sender);
			playerCheck  = (gamePlayerList.indexOf(sender) != -1);
			
		if (command == "/끝말잇기") {
		if (input == "도움말")
		{
			Bot.reply
			(
				"<끝말잇기 도움말>\n\n" +
				"● 게임시작 방법 : 생성 > 인원모집 (참가) > 시작\n" +
				"● 단어입력 방법 : \"::단어\"\n" + ("\u200b".repeat(500)) + "\n" +
				"-------------------------------------------------------------\n" +
				"/끝말잇기 [생성 / 시작 / 참가 / 기권 / 나가기 / 종료]\n" +
				"/끝말잇기 [정보 / 상태 / 데이터]\n" +
				"-------------------------------------------------------------\n" +
				"/끝말잇기 AI 추가 [초보, 중수, 고수]\n" +
				"/끝말잇기 AI 삭제\n" +
				"-------------------------------------------------------------\n" +
				"/끝말잇기 한방단어 [켜기 / 끄기]\n" +
				"-------------------------------------------------------------\n" +
				"/끝말잇기 검색 단어 [단어]\n" +
				"/끝말잇기 검색 시작단어 [글자]"
			); 
		}
		else if (input == "정보")
		{
			Bot.reply
			(
				"<끝말잇기 정보>\n\n" +
				"현재 버전 : Ver 3.1"
			);
		}
		else if (input == "상태")
		{
			if (roomCreat) { if (roomCheck) { if (gamePower)
			{
				let time = Math.floor((new Date().getTime() - gamePlayTime) / 1000),
					minute = Math.floor(time / 60),
					second = Math.floor(time % 60), lifeText = [];

				for (let i in gamePlayerData) 
				{
					if (gamePlayerList.indexOf(gamePlayerData[i]) != -1)
					{
						lifeText.push("○ " + gamePlayerData[i] + " : " + gamePlayerLife[gamePlayerList.indexOf(gamePlayerData[i])]);
					}
					else
					{
						lifeText.push("○ " + gamePlayerData[i] + " : " + 0);
					}
				}
					
				Bot.reply
				(
					"<현재 게임 상태> \n\n" + 
					"[시간 데이터]\n" +
					"● 시작 시간 : " + gameStartTime + "\n" +
					"● 플레이 시간 : " + ((!minute) ? second + "초" : minute + "분 " + second + "초") + "\n\n" +
					"[게임 데이터]\n" + 
					"● 플레이어 정보\n" + lifeText.join("\n") + "\n\n" +
					"● 사용한 단어 : " + ((gameUsedWord.length) ? gameUsedWord.length + "개\n○ " + gameUsedWord.join(" - ") : "아직 사용한 단어가 없습니다.")
				);
			}
			else Bot.replyRoom("진행중인 게임이 없습니다."); } 
			else Bot.reply("끝말잇기 방이 생성된 채팅방에서만 입력이 가능합니다."); }
			else Bot.reply("생성된 방이 없습니다.");
		}
		else if (input == "데이터")
		{
			if (!DB.isLoaded())
			{
				Bot.reply("DB를 자동으로 등록한 후 검색을 시작합니다.");
				DB.load();
			}
			
			let list = Object.keys(DB.GameData), len = list.length, 
				gameDataText = [], i, j, temp = "";

			if (list.length)
			{
				for (i = 0 ; i < len ; i ++)
				{
					gameDataText[i] = "○ " + DB.GameData[list[i]].Name + " : " + DB.GameData[list[i]].Num + "회";
				}

				for (i = 0 ; i < len - 1 ; i ++) 
				{
					for (j = i + 1 ; j < len ; j ++) 
					{
						if (Number(gameDataText[i].split(": ")[1].split("회")[0]) < Number(gameDataText[j].split(": ")[1].split("회")[0])) 
						{
							temp = gameDataText[j];
							gameDataText[j] = gameDataText[i];
							gameDataText[i] = temp;
					   }
					}
				}

				gameDataText = 
					"\n\n[게임 데이터]\n" +
					"● 사용한 단어 : " + Object.keys(DB.GameData).length + "개" + ("\u200b".repeat(500)) + "\n" +
					gameDataText.join("\n");
			}

			Bot.reply
			(
				"<끝말잇기 데이터 (Ver 3.1)>\n\n" +
				"[기본 데이터]" + "\n" +
				"● DB 단어 : " + Object.keys(DB.AllWord).length + "개\n" +
				"● 시작 단어 : " + Object.keys(DB.StartWord).length + "개" +
				gameDataText
			);
		}
		else if (input == "생성" || input == "참가")
		{
			if (input == "생성")
			{
				if (!roomCreat) 
				{
					if (WordFile.check())
					{
						Game.setPlayerAdd(sender);

						roomName = room;
						roomCreat = true;
						roomTimerPower = true;

						Bot.replyRoom
						(
							"[ " + sender + " ] 님이 끝말잇기 게임을 생성하였습니다.\n\n" + 
							"게임 참가를 원하시면 \"/끝말잇기 참가\"를 입력해 주세요."
						);

						new java.lang.Thread 
						({ 
							run : function() 
							{
								while (roomTimerPower)
								{
									Thread.sleep(1000);

									if ((roomTimerCount >= ROOM_TIMER_OUT) && (!gamePower))
									{
										Bot.replyRoom("60초가 지나 자동으로 방을 삭제합니다.");
										Game.off(); break;
									}
									else 
									{
										roomTimerCount ++; 

										(roomTimerCount == 30) ? Bot.replyRoom("30초 후 방이 삭제됩니다.") : 
										(roomTimerCount == 50) ? Bot.replyRoom("10초 후 방이 삭제됩니다.") : null;
									}	
								}
							}
						}).start();
					}
				}
				else Bot.reply("이미 생성된 방이 있습니다."); 
			}
			else if (input == "참가")
			{
				if (roomCreat) { if (roomCheck) { if (!gamePower) { if (!playerCheck)
				{
					Game.setPlayerAdd(sender);

					Bot.reply
					(
						"[ " + sender + " ] 님이 끝말잇기에 참가하셨습니다.\n\n" + 
						"현재 참가자 : " + gamePlayerList.join(", ")
					); 
				} 
				else Bot.replyRoom("중복 참여로 참가가 거부되었습니다."); } 
				else Bot.replyRoom("이미 게임이 진행중입니다."); } 
				else Bot.reply("끝말잇기 방이 생성된 채팅방에서만 입력이 가능합니다."); }
				else Bot.reply("생성된 방이 없습니다.");
			}
		}
		else if (input == "시작" || input == "종료" || input == "재시작")
		{
			if (roomCreat) { if (roomCheck) { if (managerCheck)
			{
				if (input == "시작")
				{
					if (!gamePower) { if (gamePlayerList.length >= 2) 
					{
						roomTimerCount = 0;
						roomTimerPower = false;
						gameTimerPower = true;

						Bot.replyRoom("잠시 후 게임을 시작합니다!");
						DB.load();
						
						gameStartTime = ((new Date().getHours() > 12) ? "오후 " + (new Date().getHours() - 12) : "오전 " + new Date().getHours()) + "시 " + new Date().getMinutes() + "분";
						gamePlayTime = new Date().getTime();

						Bot.replyRoom
						(
							"게임을 시작합니다!\n\n" +
							"[플레이어 목록]\n" +
							Game.printPlayer() + "\n\n" +
							"[ " + roomManager + " ] 님은 새로운 단어를 입력해 주세요" 
						);
								
						gamePower = true;
						Game.startTimer();
					}
					else Bot.replyRoom("2명 이상이 참가해야 게임 시작이 가능합니다."); }
					else Bot.replyRoom("이미 끝말잇기 게임이 진행중입니다."); 
				}
				else if (input == "종료" || input == "재시작")
				{
					if (gamePower) 
					{ 
						if (input == "종료")
						{
							Bot.replyRoom("게임이 종료됩니다.");
							Game.off();
						}
						else if (input == "재시작")
						{
							Bot.replyRoom("현재 인원으로 게임을 재시작합니다.");
							Game.restart();
						}
					}
					else Bot.replyRoom("진행중인 게임이 없습니다.");
				}
			}
			else Bot.replyRoom("방장만 입력이 가능합니다."); }
			else Bot.reply("끝말잇기 게임이 생성된 채팅방에서만 입력이 가능합니다."); }
			else Bot.reply("생성된 방이 없습니다.");
		}
		else if (input == "기권" || input == "나가기")
		{
			if (roomCreat) { if (roomCheck) { if(gamePower) { if(playerCheck)
			{
				if (input == "기권")
				{
					Bot.reply("[ " + sender + " ] 님이 게임을 기권했습니다.");
					Game.setPlayerGiveUp(sender);
				}
				else if (input == "나가기")
				{
					Bot.reply("[ " + sender + " ] 님이 게임을 나갔습니다.");
					Game.setPlayerExit(sender);
				}
			}
			else Bot.replyRoom("게임에 참가중인 상태가 아닙니다."); }
			else Bot.replyRoom("진행중인 게임이 없습니다."); }
			else Bot.reply("끝말잇기 게임이 생성된 채팅방에서만 입력이 가능합니다."); }
			else Bot.reply("생성된 방이 없습니다.");
		}
		else if (input == "검색")
		{
			if (select == "단어" || select == "시작단어")
			{
				if (!DB.isLoaded())
				{
					Bot.reply("DB를 자동으로 등록한 후 검색을 시작합니다.");
					DB.load();
				}
					
				if (select == "단어")
				{
					let inputWord = type;
	
					if (DB.isWord(inputWord))
					{
						Bot.reply
					 	(
							"<" + inputWord + "의 사전 검색 결과 : " + DB.AllWord[inputWord].length + "개>\n\n" +
							DB.getAllWordMean(inputWord)
						);
					}
					else Bot.reply("사전에 등록되지 않은 단어입니다.");
				}
				else if (select == "시작단어")
				{
					let startChar = type;
	
					if (DB.getStartWord(startChar))
					{
						Bot.reply
						(
							"<" + startChar + "(으)로 시작하는 단어 " + DB.getStartWord(startChar).length + "개>\n\n" +
							DB.getStartWord(startChar).join(", ")
						);
					}
					else Bot.reply(startChar + "로 시작하는 단어는 사전에 없습니다.");
				}
			}
		}
		else if (input == "한방단어")
		{
			if (roomCreat) { if (roomCheck) { if (managerCheck) { if(!gamePower)
			{
				if (select == "켜기")
				{
					Bot.replyRoom("한방단어 모드가 켜졌습니다.");
					modeOwnCom = true;
				}
				else if (select == "끄기")
				{
					Bot.replyRoom("한방단어 모드가 꺼졌습니다.");
					modeOwnCom = false;
				}
			}
			else Bot.replyRoom("이미 게임이 진행중입니다."); } 
			else Bot.replyRoom("방장만 입력이 가능합니다."); }
			else Bot.reply("끝말잇기 게임이 생성된 채팅방에서만 입력이 가능합니다."); }
			else Bot.reply("생성된 방이 없습니다.");
		}
		else if (input == "AI")
		{
			if (roomCreat) { if (roomCheck) { if (managerCheck) {if(!gamePower)
			{ 
				if (select == "추가" || select == "삭제")
				{
					if (select == "추가") { if (!aiCreat) 
					{ 
						if (type == "초보" || type == "중수" || type == "고수")
						{
							aiCreat = true;
							aiPower = true;
						
							switch (type)
							{
								case "초수" : case "초보" : case "초급" : 
								aiLevel = 1; aiName += "초보"; break;
	
								case "중수" : case "중급" : 
								aiLevel = 2; aiName += "중급"; break;
	
								case "고수" : case "고급" :
								aiLevel = 3; aiName += "고수"; break;
							}
	
							Game.setPlayerAdd(aiName);
	
							Bot.reply
							(
							   "[ " + aiName + " ] 를 게임을 추가했습니다.\n\n" + 
							   "현재 참가자 : " + gamePlayerList.join(", ")
							);  
						}} else Bot.replyRoom("이미 생성된 AI가 있습니다."); 
					}
					else if (select == "삭제") 
					{ 
						if (aiCreat)
						{
							aiName = "AI:";
							aiCreat = false;
							aiPower = false;
							Game.setPlayerDelete(aiName);
							Bot.replyRoom(aiName + " 가 삭제되었습니다.");
						}
						else Bot.replyRoom("생성된 AI가 없습니다."); 
					}
				}
			}
			else Bot.replyRoom("이미 게임이 진행중입니다."); } 
			else Bot.replyRoom("방장만 입력이 가능합니다."); }
			else Bot.reply("끝말잇기 게임이 생성된 채팅방에서만 입력이 가능합니다."); }
		  	else Bot.reply("생성된 방이 없습니다.");
		}}
	},

	off : function()
	{
		gamePlayerData = [];
		gamePlayerList = [];
		gamePlayerLife = [];

		gameStartTime = 0;
		gamePlayTime = 0;

		gameUsedWord = [];
		gameLastChar = "";
		gamePower = false;
		gameFirst = true;
		gameTurn = 1;

		gameTimerCount = 0;
		gameTimerStop = false;
		gameTimerPower = false;

		roomName = "";
		roomCreat = false;
		roomTimerCount = 0;
		roomTimerPower = false;

		aiLevel = 0;
		aiName = "AI:";
		aiCreat = false;
		aiPower = false;

		WordFile.saveGameData();
	},

	restart : function()
	{
		for (let i in gamePlayerList = gamePlayerData) gamePlayerLife[i] = 2; 

		gameUsedWord = []; 
		gameLastChar = "";
		gameFirst = true;
		gameTurn = 1;

		gameTimerCount = 0;

		WordFile.saveGameData();
	},
};

function response(room, message, sender, isGroupChat, replier, imageDB, packageName, threadId) { try 
{
	Bot.reply = (chatting) => { replier.reply(chatting); };
	Bot.replyRoom = (chatting) => { (roomName) ? Api.replyRoom(roomName, chatting) : ""; };
 
	Game.main(room, sender, message);
}
catch(e)
{ 
	Bot.reply
	(
		"Error Code : " + e.name + "\n\n" + 
		"Content : " + e.message + "\n\n" +
		"Line : " + e.lineNumber
	); 
}}

function onStartCompile()
{
	gameTimerPower = false; 
	roomTimerPower = false;

	WordFile.saveGameData();
};
