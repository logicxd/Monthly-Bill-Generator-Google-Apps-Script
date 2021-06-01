# Monthly Bill Generator Apps Script

Continued project from https://github.com/logicxd/Monthly-Bill-Generator-Apps-Script

Customizable and extensible way of collecting all your bills before sending out an email with a final receipt to your recipients.

From emails in your inbox: 
![Inbox Emails](https://user-images.githubusercontent.com/12219300/103873116-2dd87e00-5084-11eb-8ab6-d4c1b7be8ec6.png)

To sending out:
![Composed Email](https://user-images.githubusercontent.com/12219300/103457672-18470b00-4cb6-11eb-9e84-5c69af90e90a.png)

## How It Works

General idea:

1. Fetches Gmails with the labels you provided.
2. Runs each email through the scripts (that you provide) to parse the amount. This includes reading and attaching files!
3. Adds any additional custom scripts that you may have.
4. Finally, composes an email using the parsed data to create a "final" receipt to send to your recipients.

---

## Prerequisite

### Labeling Your Gmail

Please follow [this guide from Google](https://support.google.com/a/users/answer/9308833?hl=en).

---

## How To's

### Overall Structure

[Main.gs](Main.gs) is where most of the logic happens. The method `start` should provide an example of how things are run.

---

## Optional Features

### Stamping the "Processed" Label Name

Enabling this adds a "Processed" label to your email after the script has finished running. By doing this, it can check to make sure emails are not double-counted by ignoring all the "Processed" emails.

To enable it, modify `config.processedLabelName` to give it whatever name you'd like it to be called, for example: "Automated/Processed" is what I used.

### Cronitor

I'm using [Cronitor](http://cronitor.io/) to notify me in case my raspberry pi doesn't send out an email. It's definitely not required but would help remind me in case something goes wrong.

To enable it, add the property `cronitor_code` to your `config` with the value you get from Cronitor such as "abc123".

### Notion

I also upload my stats and data to Notion so I can see how much it's costing per month and also for reference. The method `addEntryIntoNotion()` should tell you how it works and how many parameters I'm using. Feel free to edit this to suit your needs.

---

## Resources

* [Cronitor](http://cronitor.io/) - monitor crontabs.
* [Notion](https://developers.notion.com/reference/intro) - Notion API
