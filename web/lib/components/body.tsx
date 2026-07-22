'use client'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import React, { Suspense } from 'react'
import { DataProvider } from '../../lib/utils/data-context'
import { MainContextProvider } from '../../lib/utils/main-context'
import { UserContextProvider } from '../../lib/utils/user-context'
import { ConfigProvider } from '../utils/config'
import Main from './main'

const Body = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppRouterCacheProvider>
      <ConfigProvider>
        <UserContextProvider>
          <Suspense>
            <DataProvider>
              <MainContextProvider>
                <Main>{children}</Main>
              </MainContextProvider>
            </DataProvider>
          </Suspense>
        </UserContextProvider>
      </ConfigProvider>
    </AppRouterCacheProvider>
  )
}

export default Body
