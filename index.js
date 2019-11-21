const axios = require('axios');
const cheerio = require('cheerio')
const {
    createArticle,
    createImage,
    createContentBlocks,
    createAuthor,
    createMetatags
} = require('./scrap');

const { createClient } = require("contentful-management");

const config = require("./config");
const client = createClient({
    accessToken: config.accessToken
});

const fs = require('fs');
const csv = require('csv-parser');

const { urls } = require('./urls');

function prepareUrls() {

    fs.createReadStream('urls.csv')
        .pipe(csv()).on('data', row => {
            console.log(row);
        })
        .on('end', () => {
            console.log('CSV file successfully processed');
        });

}



const init = async () => {

    const space = await client.getSpace(config.spaceId);

    const env = await space.getEnvironment(config.envId);
    // prepareUrls()
    // processData(env, 'https://glidewelldental.com/education/chairside-dental-magazine/volume-14-issue-3/letter-readers')

    // console.log(urls)
    // urls.forEach(url => {
    //     console.log(url.toString())
    //     processData(env, url.toString())
    // })

    for (let url of urls) {
        // console.log(`${url}`)
        processData(env, `${url}`)
    }


}

init()


const processData = async (env, url) => {
    axios.get(url)
        .then(async function (response) {

            const data = response.data
            const $ = cheerio.load(data)
            let title = $('title').text().trim()
            let imageBlock
            $(".mag-header-img").each(async (i, ele) => {
                let image = await createImage(env, image.attr('alt'), image.attr('src').replace("https://glidewelldental.com/wp-content/uploads/", "https://d2w2rzl10jt450.cloudfront.net/"))

                imageBlock = {
                    sys: {
                        id: image.sys.id,
                        linkType: 'Entry',
                        type: 'Link'
                    }
                }
            })


            let metaDescription;
            let tags = [];
            let description;
            let date;
            let slug;


            $("meta").each(async (i, ele) => {
                // process.stdout.write(".")

                if ($(ele).attr('name') == 'description') {
                    const metaTags = await createMetatags(env, title, $(ele).attr('content').trim())
                    metaDescription =
                        {
                            sys: {
                                id: metaTags.sys.id,
                                linkType: 'Entry',
                                type: 'Link'
                            }
                        }
                }

                if ($(ele).attr('property') == 'article:tag') {
                    tags.push($(ele).attr('content').trim())
                }
                if ($(ele).attr('property') == 'article:section') {
                    tags.push($(ele).attr('content').trim())
                }

                if ($(ele).attr('property') == 'og:description') {
                    description = $(ele).attr('content').trim()
                }

                if ($(ele).attr('property') == 'article:published_time') {
                    date = $(ele).attr('content').trim()
                }

                if ($(ele).attr('property') == 'og:url') {
                    slug = $(ele).attr('content').trim().replace("https://glidewelldental.com/", "")
                }
            })


            let conentBlocks = [];

            $("p").each(async (i, ele) => {

                let Block = await createContentBlocks(env, null, copy = $(ele).html().trim())
                conentBlocks.push(
                    {
                        sys: {
                            id: Block.sys.id,
                            linkType: 'Entry',
                            type: 'Link'
                        }
                    }
                )
            })


            // process.stdout.write("\n Generating content blocks for image")

            $(`[class^="mag-img"]`).each(async (i, ele) => {

                // console.log($(ele).attr('src'))

                if ($(ele).attr('src') == undefined) return

                // return

                let imgTag = `<img src="${$(ele).attr('src').replace("https://glidewelldental.com/wp-content/uploads/", "https://d2w2rzl110jt450.cloudfront.net/")}" alt="${$(ele).attr('alt')}">`
                let Block = await createContentBlocks(env, null, copy = imgTag)
                conentBlocks.push(
                    {
                        sys: {
                            id: Block.sys.id,
                            linkType: 'Entry',
                            type: 'Link'
                        }
                    }
                )
            })




            // return
            setTimeout(async () => {
                // console.log("conentBlocks", conentBlocks)
                process.stdout.write("Generating Article -" + title)

                await createArticle(env, title, slug, description, imageBlock, "Article", conentBlocks, metaDescription, "Chairside Magazine", null, date, tags, true, "")




            }, 6000)

        })
        .catch(function (error) {
            // handle error
            console.log(error.message);
        })
}