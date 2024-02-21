import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'
import type { GraphQlQueryResponseData } from '@octokit/graphql'
import { log } from 'console'

export async function run(): Promise<void> {
  try {
    const accessToken = core.getInput('github-token')
    const close_count = parseInt(core.getInput('close-count'))
    log(JSON.stringify(context))
    const prNumber = context.payload.pull_request?.number
    const owner = context.payload.repository?.owner.login!
    const repo = context.payload.repository?.name!
    log(`PR Number: ${prNumber}`)
    log(`Owner: ${owner}`)
    log(`Repo: ${repo}`)

    if (!prNumber) {
      core.setFailed('No PR number found')
      return
    }

    const client = getOctokit(accessToken)
    let payload = `
    {
      repository(owner: "${owner}", name: "${repo}") {
        pullRequest(number: ${prNumber}) {
          closingIssuesReferences(first: ${close_count}) {
            nodes {
              number
            }
          }
        }
      }
    }
    `

    log(payload)

    const result = await client.graphql<GraphQlQueryResponseData>(
      `{
        repository(owner: "${owner}", name: "${repo}") {
            pullRequest(number: ${prNumber}) {
                closingIssuesReferences(first: ${close_count}) {
                    nodes {
                        number
                    }
                }
            }
        }
      }
      `
    )
    log(JSON.stringify(result))
    const closingIssues =
      result.repository.pullRequest.closingIssuesReferences.nodes

    for (const issue of closingIssues) {
      const issueNumber: number = issue.number
      log(`Closing issue ${issueNumber}`)
      await client.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: 'closed'
      })
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
